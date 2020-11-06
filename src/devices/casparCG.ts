import _ from 'underscore'
import { DeviceWithState, CommandWithContext, DeviceStatus, StatusCode, literal, IDevice } from './device'
import { CasparCG, Command as CommandNS, AMCPUtil, AMCP, CasparCGSocketStatusEvent } from 'casparcg-connection'
import {
	DeviceType,
	TimelineContentTypeCasparCg,
	MappingCasparCG,
	CasparCGOptions,
	TimelineObjCCGMedia,
	TimelineObjCCGHTMLPage,
	TimelineObjCCGRoute,
	TimelineObjCCGInput,
	TimelineObjCCGRecord,
	TimelineObjCCGTemplate,
	TimelineObjCCGProducerContentBase,
	ResolvedTimelineObjectInstanceExtended,
	TimelineObjCCGIP,
	DeviceOptionsCasparCG,
	Mappings,
} from '../types/src'

import { TimelineState, ResolvedTimelineObjectInstance } from 'superfly-timeline'
import {
	CasparCGState,
	AMCPCommandVOWithContext,
	ChannelInfo,
	LayerBase,
	MediaLayer,
	InputLayer,
	TemplateLayer,
	HtmlPageLayer,
	RouteLayer,
	RecordLayer,
	EmptyLayer,
	LayerContentType,
	TransitionObject,
	State,
	NextUp,
	Transition,
	Mixer,
	AMCPCommandWithContext,
} from 'casparcg-state'
import { DoOnTime, SendMode } from '../doOnTime'
import * as request from 'request'
import { InternalState } from 'casparcg-state/dist/lib/stateObjectStorage'

const MAX_TIMESYNC_TRIES = 5
const MAX_TIMESYNC_DURATION = 40
const MEDIA_RETRY_INTERVAL = 10 * 1000 // default time in ms between checking whether a file needs to be retried loading

export interface DeviceOptionsCasparCGInternal extends DeviceOptionsCasparCG {
	options: DeviceOptionsCasparCG['options'] & { commandReceiver?: CommandReceiver }
}
export type CommandReceiver = (
	time: number,
	cmd: CommandNS.IAMCPCommand,
	context: string,
	timelineObjId: string
) => Promise<any>
/**
 * This class is used to interface with CasparCG installations. It creates
 * device states from timeline states and then diffs these states to generate
 * commands. It depends on the DoOnTime class to execute the commands timely or,
 * optionally, uses the CasparCG command scheduling features.
 */
export class CasparCGDevice extends DeviceWithState<State> implements IDevice {
	private _ccg: CasparCG = new CasparCG({ autoConnect: false })
	private _ccgState: CasparCGState
	private _queue: { [token: string]: { time: number; command: CommandNS.IAMCPCommand } } = {}
	private _commandReceiver: CommandReceiver
	private _timeToTimecodeMap: { time: number; timecode: number } = { time: 0, timecode: 0 }
	private _timeBase: { [channel: string]: number } | number = {}
	private _useScheduling?: boolean
	private _doOnTime: DoOnTime
	private initOptions?: CasparCGOptions
	private _connected = false
	private _retryTimeout?: NodeJS.Timeout
	private _retryTime: number | null = null

	constructor(deviceId: string, deviceOptions: DeviceOptionsCasparCGInternal, getCurrentTime: () => Promise<number>) {
		super(deviceId, deviceOptions, getCurrentTime)

		if (deviceOptions.options.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
		else this._commandReceiver = this._defaultCommandReceiver
		if (deviceOptions.options.timeBase) this._timeBase = deviceOptions.options.timeBase

		this._ccgState = new CasparCGState()
		this._doOnTime = new DoOnTime(
			() => {
				return this.getCurrentTime()
			},
			SendMode.BURST,
			this._deviceOptions
		)
		this.handleDoOnTime(this._doOnTime, 'CasparCG')
	}

	/**
	 * Initiates the connection with CasparCG through the ccg-connection lib and
	 * initializes CasparCG State library.
	 */
	async init(initOptions: CasparCGOptions): Promise<boolean> {
		this.initOptions = initOptions
		this._useScheduling = initOptions.useScheduling
		this._ccg = new CasparCG({
			host: initOptions.host,
			port: initOptions.port,
			autoConnect: true,
			virginServerCheck: true,
			onConnectionChanged: (connected: boolean) => {
				this._connected = connected
				this._connectionChanged()
			},
		})

		this._ccg.on(CasparCGSocketStatusEvent.CONNECTED, (event: CasparCGSocketStatusEvent) => {
			this.makeReady(false) // always make sure timecode is correct, setting it can never do bad
				.catch((e) => this.emit('error', 'casparCG.makeReady', e))
			if (event.valueOf().virginServer === true) {
				// a "virgin server" was just restarted (so it is cleared & black).
				// Otherwise it was probably just a loss of connection

				this._ccgState.softClearState()
				this.clearStates()
				this.emit('resetResolver')
			}
		})

		const command = await this._ccg.info()
		this._ccgState.initStateFromChannelInfo(
			_.map(command.response.data, (obj: any) => {
				return {
					channelNo: obj.channel,
					videoMode: obj.format.toUpperCase(),
					fps: obj.frameRate,
				}
			}) as ChannelInfo[],
			this.getCurrentTime()
		)

		if (typeof initOptions.retryInterval === 'number') {
			this._retryTime = initOptions.retryInterval || MEDIA_RETRY_INTERVAL
			this._retryTimeout = setTimeout(() => this._assertIntendedState(), this._retryTime)
		}

		return true
	}

	/**
	 * Terminates the device safely such that things can be garbage collected.
	 */
	terminate(): Promise<boolean> {
		this._doOnTime.dispose()
		if (this._retryTimeout) clearTimeout(this._retryTimeout)
		return new Promise((resolve) => {
			this._ccg.disconnect()
			this._ccg.onDisconnected = () => {
				resolve()
			}
		})
	}
	/** Called by the Conductor a bit before a .handleState is called */
	prepareForHandleState(newStateTime: number) {
		// Clear any queued commands later than this time:
		if (this._useScheduling) {
			// Can't do it
			// this._clearScheduledFutureCommands(newStateTime, commandsToAchieveState)
		} else {
			this._doOnTime.clearQueueNowAndAfter(newStateTime)
			this.cleanUpStates(0, newStateTime)
		}
	}
	/**
	 * Generates an array of CasparCG commands by comparing the newState against the oldState, or the current device state.
	 */
	handleState(newState: TimelineState, newMappings: Mappings) {
		super.onHandleState(newState, newMappings)
		// check if initialized:
		if (!this._ccgState.isInitialised) {
			this.emit('warning', 'CasparCG State not initialized yet')
			return
		}

		const previousStateTime = Math.max(this.getCurrentTime(), newState.time)

		const oldCasparState = (this.getStateBefore(previousStateTime) || { state: { channels: {} } }).state

		const newCasparState = this.convertStateToCaspar(newState, newMappings)

		const commandsToAchieveState = this._diffStates(oldCasparState, newCasparState, newState.time)

		// clear any queued commands later than this time:
		if (this._useScheduling) {
			this._clearScheduledFutureCommands(newState.time, commandsToAchieveState)
		} else {
			this._doOnTime.clearQueueNowAndAfter(previousStateTime)
		}
		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newCasparState, newState.time)
	}

	/**
	 * Clear any scheduled commands after this time
	 * @param clearAfterTime
	 */
	clearFuture(clearAfterTime: number) {
		if (this._useScheduling) {
			for (const token in this._queue) {
				if (this._queue[token].time > clearAfterTime) {
					this._doCommand(
						new AMCP.ScheduleRemoveCommand(token),
						`clearFuture (${clearAfterTime})`,
						''
					).catch((e) => this.emit('error', 'CasparCG.ScheduleRemoveCommand', e))
				}
			}
		} else {
			this._doOnTime.clearQueueAfter(clearAfterTime)
		}
	}
	get canConnect(): boolean {
		return true
	}
	get connected(): boolean {
		// Returns connection status
		return this._ccg ? this._ccg.connected : false
	}

	get deviceType() {
		return DeviceType.CASPARCG
	}
	get deviceName(): string {
		if (this._ccg) {
			return 'CasparCG ' + this.deviceId + ' ' + this._ccg.host + ':' + this._ccg.port
		} else {
			return 'Uninitialized CasparCG ' + this.deviceId
		}
	}

	get queue() {
		if (this._queue) {
			return _.map(this._queue, (val, index) => [val, index])
		} else {
			return []
		}
	}

	private convertObjectToCasparState(
		mappings: Mappings,
		layer: ResolvedTimelineObjectInstance,
		mapping: MappingCasparCG,
		isForeground: boolean
	): LayerBase {
		let startTime = layer.instance.originalStart || layer.instance.start
		if (startTime === 0) startTime = 1 // @todo: startTime === 0 will make ccg-state seek to the current time

		let stateLayer: LayerBase | null = null
		if (layer.content.type === TimelineContentTypeCasparCg.MEDIA) {
			const mediaObj = (layer as any) as TimelineObjCCGMedia

			const holdOnFirstFrame = !isForeground || mediaObj.isLookahead
			const loopingPlayTime =
				mediaObj.content.loop && !mediaObj.content.seek && !mediaObj.content.inPoint && !mediaObj.content.length

			stateLayer = literal<MediaLayer>({
				id: layer.id,
				layerNo: mapping.layer,
				content: LayerContentType.MEDIA,
				media: mediaObj.content.file,
				playTime: !holdOnFirstFrame && (mediaObj.content.noStarttime || loopingPlayTime) ? null : startTime,

				pauseTime: holdOnFirstFrame ? startTime : mediaObj.content.pauseTime || null,
				playing:
					!mediaObj.isLookahead &&
					(mediaObj.content.playing !== undefined ? mediaObj.content.playing : isForeground),

				looping: mediaObj.content.loop,
				seek: mediaObj.content.seek,
				inPoint: mediaObj.content.inPoint,
				length: mediaObj.content.length,

				channelLayout: mediaObj.content.channelLayout,
				clearOn404: true,

				vfilter: mediaObj.content.videoFilter,
				afilter: mediaObj.content.audioFilter,
			})
			// this.emit('debug', stateLayer)
		} else if (layer.content.type === TimelineContentTypeCasparCg.IP) {
			const ipObj = (layer as any) as TimelineObjCCGIP

			stateLayer = literal<MediaLayer>({
				id: layer.id,
				layerNo: mapping.layer,
				content: LayerContentType.MEDIA,
				media: ipObj.content.uri,
				channelLayout: ipObj.content.channelLayout,
				playTime: null, // ip inputs can't be seeked // layer.resolved.startTime || null,
				playing: true,
				seek: 0, // ip inputs can't be seeked

				vfilter: ipObj.content.videoFilter,
				afilter: ipObj.content.audioFilter,
			})
		} else if (layer.content.type === TimelineContentTypeCasparCg.INPUT) {
			const inputObj = (layer as any) as TimelineObjCCGInput

			stateLayer = literal<InputLayer>({
				id: layer.id,
				layerNo: mapping.layer,
				content: LayerContentType.INPUT,
				media: 'decklink',
				input: {
					device: inputObj.content.device,
					channelLayout: inputObj.content.channelLayout,
					format: inputObj.content.deviceFormat,
				},
				filter: inputObj.content.filter,
				playing: true,
				playTime: null,

				vfilter: inputObj.content.videoFilter,
				afilter: inputObj.content.audioFilter,
			})
		} else if (layer.content.type === TimelineContentTypeCasparCg.TEMPLATE) {
			const recordObj = (layer as any) as TimelineObjCCGTemplate

			stateLayer = literal<TemplateLayer>({
				id: layer.id,
				layerNo: mapping.layer,
				content: LayerContentType.TEMPLATE,
				media: recordObj.content.name,

				playTime: startTime || null,
				playing: true,

				templateType: recordObj.content.templateType || 'html',
				templateData: recordObj.content.data,
				cgStop: recordObj.content.useStopCommand,
			})
		} else if (layer.content.type === TimelineContentTypeCasparCg.HTMLPAGE) {
			const htmlObj = (layer as any) as TimelineObjCCGHTMLPage

			stateLayer = literal<HtmlPageLayer>({
				id: layer.id,
				layerNo: mapping.layer,
				content: LayerContentType.HTMLPAGE,
				media: htmlObj.content.url,

				playTime: startTime || null,
				playing: true,
			})
		} else if (layer.content.type === TimelineContentTypeCasparCg.ROUTE) {
			const routeObj = (layer as any) as TimelineObjCCGRoute

			if (routeObj.content.mappedLayer) {
				const routeMapping = mappings[routeObj.content.mappedLayer] as MappingCasparCG
				if (routeMapping && routeMapping.deviceId === this.deviceId) {
					routeObj.content.channel = routeMapping.channel
					routeObj.content.layer = routeMapping.layer
				}
			}
			stateLayer = literal<RouteLayer>({
				id: layer.id,
				layerNo: mapping.layer,
				content: LayerContentType.ROUTE,
				media: 'route',
				route: {
					channel: routeObj.content.channel || 0,
					layer: routeObj.content.layer,
					channelLayout: routeObj.content.channelLayout,
				},
				mode: routeObj.content.mode || undefined,
				delay: routeObj.content.delay || undefined,
				playing: true,
				playTime: null, // layer.resolved.startTime || null,

				vfilter: routeObj.content.videoFilter,
				afilter: routeObj.content.audioFilter,
			})
		} else if (layer.content.type === TimelineContentTypeCasparCg.RECORD) {
			const recordObj = (layer as any) as TimelineObjCCGRecord

			if (startTime) {
				stateLayer = literal<RecordLayer>({
					id: layer.id,
					layerNo: mapping.layer,
					content: LayerContentType.RECORD,
					media: recordObj.content.file,
					encoderOptions: recordObj.content.encoderOptions,
					playing: true,
					playTime: startTime || 0,
				})
			}
		}

		// if no appropriate layer could be created, make it an empty layer
		if (!stateLayer) {
			const l: EmptyLayer = {
				id: layer.id,
				layerNo: mapping.layer,
				content: LayerContentType.NOTHING,
				playing: false,
			}
			stateLayer = l
		} // now it holds that stateLayer is truthy

		const baseContent = layer.content as TimelineObjCCGProducerContentBase
		if (baseContent.transitions) {
			// add transitions to the layer obj
			// create transition object
			const transitions = {} as any
			switch (baseContent.type) {
				case TimelineContentTypeCasparCg.MEDIA:
				case TimelineContentTypeCasparCg.IP:
				case TimelineContentTypeCasparCg.TEMPLATE:
				case TimelineContentTypeCasparCg.INPUT:
				case TimelineContentTypeCasparCg.ROUTE:
					if (baseContent.transitions.inTransition) {
						transitions.inTransition = new Transition(baseContent.transitions.inTransition)
					}
					if (baseContent.transitions.outTransition) {
						transitions.outTransition = new Transition(baseContent.transitions.outTransition)
					}
					stateLayer.media = new TransitionObject(stateLayer.media, {
						inTransition: transitions.inTransition,
						outTransition: transitions.outTransition,
					})
					break
				default:
					// create transition using mixer
					break
			}
		}
		if (layer.content.mixer) {
			// add mixer properties
			// just pass through values here:
			const mixer: Mixer = {}
			_.each(layer.content.mixer, (value, property) => {
				mixer[property] = value
			})
			stateLayer.mixer = mixer
		}

		stateLayer.layerNo = mapping.layer
		return stateLayer
	}

	/**
	 * Takes a timeline state and returns a CasparCG State that will work with the state lib.
	 * @param timelineState The timeline state to generate from.
	 */
	convertStateToCaspar(timelineState: TimelineState, mappings: Mappings): State {
		const caspar: State = {
			channels: {},
		}

		_.each(mappings, (foundMapping, layerName) => {
			if (
				foundMapping &&
				foundMapping.device === DeviceType.CASPARCG &&
				foundMapping.deviceId === this.deviceId &&
				_.has(foundMapping, 'channel') &&
				_.has(foundMapping, 'layer')
			) {
				const mapping = foundMapping as MappingCasparCG
				mapping.channel = mapping.channel || 0
				mapping.layer = mapping.layer || 0

				// create a channel in state if necessary, or reuse existing channel
				const channel = caspar.channels[mapping.channel] || { channelNo: mapping.channel, layers: {} }
				channel.channelNo = Number(mapping.channel) || 1
				channel.fps = this.initOptions ? this.initOptions.fps || 25 : 25
				caspar.channels[channel.channelNo] = channel

				// @todo: check if we need to get fps.
				channel.fps = this.initOptions ? this.initOptions.fps || 25 : 25
				caspar.channels[mapping.channel] = channel

				let foregroundObj = timelineState.layers[layerName] as ResolvedTimelineObjectInstance | undefined
				let backgroundObj = _.last(
					_.filter(timelineState.layers, (obj) => {
						// Takes the last one, to be consistent with previous behaviour
						const objExt = obj as ResolvedTimelineObjectInstanceExtended
						return !!objExt.isLookahead && objExt.lookaheadForLayer === layerName
					})
				)

				// If lookahead is on the same layer, then ensure objects are treated as such
				if (foregroundObj && (foregroundObj as ResolvedTimelineObjectInstanceExtended).isLookahead) {
					backgroundObj = foregroundObj
					foregroundObj = undefined
				}

				// create layer of appropriate type
				const foregroundStateLayer = foregroundObj
					? this.convertObjectToCasparState(mappings, foregroundObj, mapping, true)
					: undefined
				const backgroundStateLayer = backgroundObj
					? this.convertObjectToCasparState(mappings, backgroundObj, mapping, false)
					: undefined

				if (foregroundStateLayer) {
					channel.layers[mapping.layer] = {
						...foregroundStateLayer,
						nextUp: backgroundStateLayer
							? literal<NextUp>({
									...(backgroundStateLayer as NextUp),
									auto: false,
							  })
							: undefined,
					}
				} else if (backgroundStateLayer) {
					if (mapping.previewWhenNotOnAir) {
						channel.layers[mapping.layer] = {
							...backgroundStateLayer,
							playing: false,
						}
					} else {
						channel.layers[mapping.layer] = literal<EmptyLayer>({
							id: `${backgroundStateLayer.id}_empty_base`,
							layerNo: mapping.layer,
							content: LayerContentType.NOTHING,
							playing: false,
							nextUp: literal<NextUp>({
								...(backgroundStateLayer as NextUp),
								auto: false,
							}),
						})
					}
				}
			}
		})

		return caspar
	}

	/**
	 * Prepares the physical device for playout. If amcp scheduling is used this
	 * tries to sync the timecode. If {@code okToDestroyStuff === true} this clears
	 * all channels and resets our states.
	 * @param okToDestroyStuff Whether it is OK to restart the device
	 */
	async makeReady(okToDestroyStuff?: boolean): Promise<void> {
		// Sync Caspar Time to our time:
		const command = await this._ccg.info()
		const channels: any[] = command.response.data
		const attemptSync = async (channelNo: number, tries: number): Promise<void> => {
			const startTime = this.getCurrentTime()
			await this._commandReceiver(
				startTime,
				new AMCP.TimeCommand({
					channel: channelNo,
					timecode: this.convertTimeToTimecode(startTime, channelNo),
				}),
				'makeReady',
				''
			)

			const duration = this.getCurrentTime() - startTime
			if (duration > MAX_TIMESYNC_DURATION) {
				// @todo: acceptable time is dependent on fps
				if (tries > MAX_TIMESYNC_TRIES) {
					this.emit(
						'error',
						'CasparCG',
						new Error(
							`CasparCG Time command took too long (${MAX_TIMESYNC_TRIES} tries took longer than ${MAX_TIMESYNC_DURATION}ms), channel will be slightly out of sync!`
						)
					)
					return Promise.resolve()
				}
				await new Promise((resolve) => {
					setTimeout(() => resolve(), MAX_TIMESYNC_DURATION)
				})
				await attemptSync(channelNo, tries + 1)
			}
		}

		if (this._useScheduling) {
			for (const i in channels) {
				const channel = channels[i]
				const channelNo = channel.channel
				await attemptSync(channelNo, 1)
			}
		}
		// Clear all channels (?)
		if (okToDestroyStuff) {
			await Promise.all(
				_.map(channels, async (channel: any) => {
					await this._commandReceiver(
						this.getCurrentTime(),
						new AMCP.ClearCommand({
							channel: channel.channel,
						}),
						'makeReady and destroystuff',
						''
					)
				})
			)
		}
		// reset our own state(s):
		if (okToDestroyStuff) {
			this.clearStates()
		}
		// a resolveTimeline will be triggered later
	}

	/**
	 * Attemps to restart casparcg over the HTTP API provided by CasparCG launcher.
	 */
	restartCasparCG(): Promise<any> {
		return new Promise((resolve, reject) => {
			if (!this.initOptions) throw new Error('CasparCGDevice._connectionOptions is not set!')
			if (!this.initOptions.launcherHost) throw new Error('CasparCGDevice: config.launcherHost is not set!')
			if (!this.initOptions.launcherPort) throw new Error('CasparCGDevice: config.launcherPort is not set!')

			const url = `http://${this.initOptions.launcherHost}:${this.initOptions.launcherPort}/processes/casparcg/restart`
			request.post(
				url,
				{}, // json: cmd.params
				(error, response) => {
					if (error) {
						reject(error)
					} else if (response.statusCode === 200) {
						resolve()
					} else {
						reject('Bad reply: [' + response.statusCode + '] ' + response.body)
					}
				}
			)
		})
	}
	getStatus(): DeviceStatus {
		let statusCode = StatusCode.GOOD
		const messages: Array<string> = []

		if (statusCode === StatusCode.GOOD) {
			if (!this._connected) {
				statusCode = StatusCode.BAD
				messages.push(`CasparCG disconnected`)
			}
		}

		if (!this._ccgState.isInitialised) {
			statusCode = StatusCode.BAD
			messages.push(`CasparCG device connection not initialized (restart required)`)
		}

		return {
			statusCode: statusCode,
			messages: messages,
			active: this.isActive,
		}
	}
	/**
	 * Compares the new timeline-state with the old one, and generates commands to account for the difference
	 */
	private _diffStates(oldState: State, newState: State, time: number): Array<AMCPCommandVOWithContext> {
		// @todo: this is a tmp fix for the command order. should be removed when ccg-state has been refactored.
		return CasparCGState.diffStatesOrderedCommands((oldState as unknown) as InternalState, newState, time)
	}
	private _doCommand(command: CommandNS.IAMCPCommand, context: string, timlineObjId: string): Promise<void> {
		const time = this.getCurrentTime()
		return this._commandReceiver(time, command, context, timlineObjId)
	}
	/**
	 * Clear future commands after {@code time} if they are not in {@code commandsToSendNow}.
	 */
	private _clearScheduledFutureCommands(time: number, commandsToSendNow: Array<AMCPCommandVOWithContext>) {
		// clear any queued commands later than this time:
		const now = this.getCurrentTime()

		_.each(this._queue, (q, token: string) => {
			if (q.time < now) {
				// the command has expired / been executed
				delete this._queue[token]
			} else if (q.time >= time) {
				// The command is in the future

				// check if that command is about to be scheduled here as well:
				let matchingCommand: CommandNS.IAMCPCommand | undefined
				let matchingCommandI = -1
				if (q.time === time) {
					_.each(commandsToSendNow, (cmd: CommandNS.IAMCPCommandVO, i) => {
						const command: CommandNS.IAMCPCommand = AMCPUtil.deSerialize(cmd, 'id')

						if (
							command.name === q.command.name &&
							command.channel === q.command.channel &&
							command.layer === q.command.layer &&
							_.isEqual(command.payload, q.command.payload)
						) {
							matchingCommand = command
							matchingCommandI = i
						}
					})
				}

				if (matchingCommand) {
					// We're about to send a command that's already scheduled in CasparCG
					// just ignore it then..

					// remove the commands from commands to send
					commandsToSendNow.splice(matchingCommandI, 1)
				} else {
					this._doCommand(
						new AMCP.ScheduleRemoveCommand(token),
						`_clearScheduledFutureCommands (${time})`,
						''
					).catch((e) => this.emit('error', 'CasparCG.ScheduleRemoveCommand', e))
					delete this._queue[token]
				}
			}
		})
	}
	/**
	 * Use either AMCP Command Scheduling or the doOnTime to execute commands at
	 * {@code time}.
	 * @param commandsToAchieveState Commands to be added to queue
	 * @param time Point in time to send commands at
	 */
	private _addToQueue(commandsToAchieveState: Array<AMCPCommandVOWithContext>, time: number) {
		let i = 0
		const now = this.getCurrentTime()

		_.each(commandsToAchieveState, (cmd: AMCPCommandVOWithContext) => {
			const command = AMCPUtil.deSerialize(cmd, 'id')

			if (this._useScheduling) {
				if (time <= now) {
					this._doCommand(command, cmd.context.context, cmd.context.layerId).catch((e) =>
						this.emit('error', 'CasparCG._doCommand', e)
					)
				} else {
					const token = `${time.toString(36).substr(-8)}_${('000' + i++).substr(-4)}`
					const scheduleCommand = new AMCP.ScheduleSetCommand({
						token,
						timecode: this.convertTimeToTimecode(time, command.channel),
						command,
					})
					this._doCommand(scheduleCommand, cmd.context.context, cmd.context.layerId).catch((e) =>
						this.emit('error', 'CasparCG._doCommand', e)
					)
					this._queue[token] = {
						time: time,
						command: command,
					}
				}
			} else {
				this._doOnTime.queue(
					time,
					undefined,
					(c: { command: CommandNS.IAMCPCommand; cmd: AMCPCommandVOWithContext }) => {
						return this._doCommand(c.command, c.cmd.context.context, c.cmd.context.layerId)
					},
					{ command: command, cmd: cmd }
				)
			}
		})
	}
	/**
	 * Sends a command over a casparcg-connection instance
	 * @param time deprecated
	 * @param cmd Command to execute
	 */
	private _defaultCommandReceiver(
		time: number,
		cmd: CommandNS.IAMCPCommand,
		context: string,
		timelineObjId: string
	): Promise<any> {
		// do no retry while we are sending commands, instead always retry closely after:
		if (!context.match(/\[RETRY\]/i)) {
			if (this._retryTimeout) clearTimeout(this._retryTimeout)
			if (this._retryTime) this._retryTimeout = setTimeout(() => this._assertIntendedState(), this._retryTime)
		}

		const cwc: CommandWithContext = {
			context: context,
			timelineObjId: timelineObjId,
			command: JSON.stringify(cmd),
		}
		this.emit('debug', cwc)

		return this._ccg
			.do(cmd)
			.then((resCommand) => {
				if (this._queue[resCommand.token]) {
					delete this._queue[resCommand.token]
				}
				// If the command was performed successfully, copy the state from the current state into the tracked caspar-state:
				// This is later used in _assertIntendedState
				if (
					(resCommand.name === 'LoadbgCommand' ||
						resCommand.name === 'PlayCommand' ||
						resCommand.name === 'LoadCommand' ||
						resCommand.name === 'ClearCommand' ||
						resCommand.name === 'StopCommand' ||
						resCommand.name === 'ResumeCommand') &&
					resCommand.channel &&
					resCommand.layer
				) {
					const currentState = this.getState(time)
					if (currentState) {
						const currentCasparState = currentState.state

						const trackedState = this._ccgState.getState()

						const channel = currentCasparState.channels[resCommand.channel]
						if (channel) {
							if (!trackedState.channels[resCommand.channel]) {
								trackedState.channels[resCommand.channel] = {
									channelNo: channel.channelNo,
									fps: channel.fps || 0,
									videoMode: channel.videoMode || null,
									layers: {},
								}
							}
							// Copy the tracked from current state:
							trackedState.channels[resCommand.channel].layers[resCommand.layer] =
								channel.layers[resCommand.layer]
							this._ccgState.setState(trackedState)
						}
					}
				}
			})
			.catch((error) => {
				let errorString = ''
				if (error && error.response && error.response.code === 404) {
					errorString = `404: File not found`
				}

				if (!errorString) {
					errorString = error && error.response && error.response.raw ? error.response.raw : error.toString()
				}

				if (cmd.name) {
					errorString += ` ${cmd.name} `
				}
				if (
					((cmd as unknown) as AMCPCommandVOWithContext)['_objectParams'] &&
					!_.isEmpty(((cmd as unknown) as AMCPCommandVOWithContext)['_objectParams'])
				) {
					errorString +=
						', params: ' + JSON.stringify(((cmd as unknown) as AMCPCommandVOWithContext)['_objectParams'])
				} else if (cmd.payload && !_.isEmpty(cmd.payload)) {
					errorString += ', payload: ' + JSON.stringify(cmd.payload)
				}
				this.emit('commandError', new Error(errorString), cwc)
				if (cmd.name === 'ScheduleSetCommand') {
					// delete this._queue[cmd.getParam('command').token]
					delete this._queue[cmd.token]
				}
			})
	}

	/**
	 * This function takes the current timeline-state, and diffs it with the known
	 * CasparCG state. If any media has failed to load, it will create a diff with
	 * the intended (timeline) state and that command will be executed.
	 */
	private _assertIntendedState() {
		if (this._retryTime) {
			this._retryTimeout = setTimeout(() => this._assertIntendedState(), this._retryTime)
		}

		const tlState = this.getState(this.getCurrentTime())

		if (!tlState) return // no state implies any state is correct

		const ccgState = tlState.state

		const diff = this._ccgState.getDiff(ccgState, this.getCurrentTime())

		const cmd: Array<AMCPCommandVOWithContext> = []
		for (const layer of diff) {
			// filter out media commands
			for (let i = 0; i < layer.cmds.length; i++) {
				if (
					layer.cmds[i]._commandName === 'LoadbgCommand' ||
					(layer.cmds[i]._commandName === 'PlayCommand' && layer.cmds[i]._objectParams.clip) ||
					layer.cmds[i]._commandName === 'LoadCommand'
				) {
					layer.cmds[i].context.context += ' [RETRY]'
					cmd.push(layer.cmds[i])
				}
			}
		}

		if (cmd.length > 0) {
			this._addToQueue(cmd, this.getCurrentTime())
		}
	}

	/**
	 * Converts ms to timecode.
	 * @param time Time to convert
	 * @param channel Channel to use for timebase
	 */
	private convertTimeToTimecode(time: number, channel: number): string {
		const relTime = time - this._timeToTimecodeMap.time
		const timecodeTime = this._timeToTimecodeMap.timecode + relTime

		const timeBase =
			(typeof this._timeBase === 'object' ? this._timeBase[channel + ''] : this._timeBase) ||
			(this.initOptions ? this.initOptions.fps || 25 : 25)

		const timecode = [
			('0' + (Math.floor(timecodeTime / 3.6e6) % 24)).substr(-2),
			('0' + (Math.floor(timecodeTime / 6e4) % 60)).substr(-2),
			('0' + (Math.floor(timecodeTime / 1e3) % 60)).substr(-2),
			('0' + (Math.floor(timecodeTime / (1000 / timeBase)) % timeBase)).substr(-(timeBase + '').length),
		]

		return timecode.join(':')
	}
	private _connectionChanged() {
		this.emit('connectionChanged', this.getStatus())
	}
}
