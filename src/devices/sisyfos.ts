import _ from 'underscore'
import { DeviceWithState, CommandWithContext, DeviceStatus, StatusCode, IDevice } from './device'
import { DeviceType, DeviceOptionsSisyfos, Mappings } from '../types/src'
import { DoOnTime, SendMode } from '../doOnTime'

import { TimelineState, ResolvedTimelineObjectInstance } from 'superfly-timeline'
import {
	SisyfosOptions,
	MappingSisyfos,
	MappingSisyfosType,
	TimelineObjSisyfosAny,
	TimelineContentTypeSisyfos,
	SisyfosChannelOptions,
} from '../types/src/sisyfos'
import { SisyfosApi, SisyfosCommand, SisyfosState, SisyfosChannel, SisyfosCommandType } from './sisyfosAPI'

export interface DeviceOptionsSisyfosInternal extends DeviceOptionsSisyfos {
	options: DeviceOptionsSisyfos['options'] & { commandReceiver?: CommandReceiver }
}
export type CommandReceiver = (
	time: number,
	cmd: SisyfosCommand,
	context: CommandContext,
	timelineObjId: string
) => Promise<any>
interface Command {
	content: SisyfosCommand
	context: CommandContext
	timelineObjId: string
}
type CommandContext = string
/**
 * This is a generic wrapper for any osc-enabled device.
 */
export class SisyfosMessageDevice extends DeviceWithState<SisyfosState> implements IDevice {
	private _doOnTime: DoOnTime
	private _sisyfos: SisyfosApi

	private _commandReceiver: CommandReceiver

	private _resyncing = false

	constructor(deviceId: string, deviceOptions: DeviceOptionsSisyfosInternal, getCurrentTime: () => Promise<number>) {
		super(deviceId, deviceOptions, getCurrentTime)
		if (deviceOptions.options?.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
		else this._commandReceiver = this._defaultCommandReceiver

		this._sisyfos = new SisyfosApi()
		this._sisyfos.on('error', (e) => this.emit('error', 'Sisyfos', e))
		this._sisyfos.on('connected', () => {
			this._connectionChanged()
		})
		this._sisyfos.on('disconnected', () => {
			this._connectionChanged()
		})
		this._sisyfos.on('mixerOnline', (onlineStatus) => {
			this._sisyfos.setMixerOnline(onlineStatus)
			this._connectionChanged()
		})

		this._doOnTime = new DoOnTime(
			() => {
				return this.getCurrentTime()
			},
			SendMode.BURST,
			this._deviceOptions
		)
		this.handleDoOnTime(this._doOnTime, 'Sisyfos')
	}
	init(initOptions: SisyfosOptions): Promise<boolean> {
		this._sisyfos.once('initialized', () => {
			this.setState(this.getDeviceState(false), this.getCurrentTime())
			this.emit('resetResolver')
		})

		return this._sisyfos.connect(initOptions.host, initOptions.port).then(() => true)
	}
	/** Called by the Conductor a bit before a .handleState is called */
	prepareForHandleState(newStateTime: number) {
		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(newStateTime)
		this.cleanUpStates(0, newStateTime)
	}
	/**
	 * Handles a new state such that the device will be in that state at a specific point
	 * in time.
	 * @param newState
	 */
	handleState(newState: TimelineState, newMappings: Mappings) {
		super.onHandleState(newState, newMappings)
		if (!this._sisyfos.state) {
			this.emit('warning', 'Sisyfos State not initialized yet')
			return
		}

		// Transform timeline states into device states
		const previousStateTime = Math.max(this.getCurrentTime(), newState.time)
		const oldSisyfosState: SisyfosState = (
			this.getStateBefore(previousStateTime) || { state: { channels: {}, resync: false } }
		).state

		const newSisyfosState = this.convertStateToSisyfosState(newState, newMappings)

		this._handleStateInner(oldSisyfosState, newSisyfosState, previousStateTime, newState.time)
	}

	private _handleStateInner(
		oldSisyfosState: SisyfosState,
		newSisyfosState: SisyfosState,
		previousStateTime: number,
		newTime: number
	) {
		// Generate commands necessary to transition to the new state
		const commandsToAchieveState: Array<Command> = this._diffStates(oldSisyfosState, newSisyfosState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)
		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newTime)

		// store the new state, for later use:
		this.setState(newSisyfosState, newTime)
	}

	/**
	 * Clear any scheduled commands after this time
	 * @param clearAfterTime
	 */
	clearFuture(clearAfterTime: number) {
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}
	terminate() {
		this._doOnTime.dispose()
		return Promise.resolve(true)
	}
	getStatus(): DeviceStatus {
		let statusCode = StatusCode.GOOD
		const messages: Array<string> = []

		if (!this._sisyfos.connected) {
			statusCode = StatusCode.BAD
			messages.push('Not connected')
		}

		if (!this._sisyfos.state && !this._resyncing) {
			statusCode = StatusCode.BAD
			messages.push(`Sisyfos device connection not initialized (restart required)`)
		}

		if (!this._sisyfos.mixerOnline) {
			statusCode = StatusCode.BAD
			messages.push(`Sisyfos has no connection to Audiomixer`)
		}
		return {
			statusCode: statusCode,
			messages: messages,
			active: this.isActive,
		}
	}
	makeReady(okToDestroyStuff?: boolean): Promise<void> {
		return this._makeReadyInner(okToDestroyStuff)
	}

	private _makeReadyInner(okToDestroyStuff?: boolean, resync?: boolean): Promise<void> {
		if (okToDestroyStuff) {
			if (resync) {
				this._resyncing = true
				// If state is still not reinitialised afer 5 seconds, we may have a problem.
				setTimeout(() => (this._resyncing = false), 5000)
			}

			this._doOnTime.clearQueueNowAndAfter(this.getCurrentTime())
			this._sisyfos.reInitialize()
			this._sisyfos.on('initialized', () => {
				if (resync) {
					this._resyncing = false
					const targetState = this.getState(this.getCurrentTime())

					if (targetState) {
						this._handleStateInner(
							this.getDeviceState(false),
							targetState.state,
							targetState.time,
							this.getCurrentTime()
						)
					}
				} else {
					this.setState(this.getDeviceState(false), this.getCurrentTime())
					this.emit('resetResolver')
				}
			})
		}
		return Promise.resolve()
	}

	get canConnect(): boolean {
		return true
	}
	get connected(): boolean {
		return this._sisyfos.connected
	}
	getDeviceState(isDefaultState = true): SisyfosState {
		let deviceStateFromAPI = this._sisyfos.state
		const deviceState: SisyfosState = {
			channels: {},
			resync: false,
		}

		if (!deviceStateFromAPI) deviceStateFromAPI = deviceState

		for (const ch of Object.keys(deviceStateFromAPI.channels)) {
			const channelFromAPI = deviceStateFromAPI.channels[ch]

			let channel: SisyfosChannel = {
				...channelFromAPI,
				tlObjIds: [],
			}

			if (isDefaultState) {
				// reset values for default state
				channel = {
					...channel,
					...this.getDefaultStateChannel(),
				}
			}

			deviceState.channels[ch] = channel
		}
		return deviceState
	}
	getDefaultStateChannel(): SisyfosChannel {
		return {
			faderLevel: 0.75, // 0 dB
			pgmOn: 0,
			pstOn: 0,
			label: '',
			visible: true,
			tlObjIds: [],
		}
	}
	/**
	 * Transform the timeline state into a device state, which is in this case also
	 * a timeline state.
	 * @param state
	 */
	convertStateToSisyfosState(state: TimelineState, mappings: Mappings) {
		const deviceState: SisyfosState = this.getDeviceState()

		_.each(state.layers, (tlObject, layerName) => {
			const layer = tlObject as ResolvedTimelineObjectInstance & TimelineObjSisyfosAny
			let foundMapping = mappings[layerName] as MappingSisyfos | undefined

			const content = tlObject.content as TimelineObjSisyfosAny['content']

			// Allow resync without valid channel mapping
			if (layer.content.resync !== undefined) {
				deviceState.resync = deviceState.resync || layer.content.resync
			}

			// if the tlObj is specifies to load to PST the original Layer is used to resolve the mapping
			if (!foundMapping && layer.isLookahead && layer.lookaheadForLayer) {
				foundMapping = mappings[layer.lookaheadForLayer] as MappingSisyfos | undefined
			}

			// Preparation: put all channels that comes from the state in an array:
			const newChannels: ({
				overridePriority: number
				channel: number
				isLookahead: boolean
				tlObjId: string
			} & SisyfosChannelOptions)[] = []
			if (foundMapping && foundMapping.deviceId === this.deviceId) {
				if (!foundMapping.mappingType) (foundMapping as MappingSisyfos).mappingType = MappingSisyfosType.CHANNEL
				if ((content.type as string) === 'sisyfos') content.type = TimelineContentTypeSisyfos.CHANNEL

				if (
					foundMapping.mappingType === MappingSisyfosType.CHANNEL &&
					content.type === TimelineContentTypeSisyfos.CHANNEL
				) {
					newChannels.push({
						...content,
						channel: foundMapping.channel,
						overridePriority: content.overridePriority || 0,
						isLookahead: layer.isLookahead || false,
						tlObjId: layer.id,
					})
				} else if (
					foundMapping.mappingType === MappingSisyfosType.CHANNELS &&
					content.type === TimelineContentTypeSisyfos.CHANNELS
				) {
					_.each(content.channels, (channel) => {
						const referencedMapping = mappings[channel.mappedLayer] as MappingSisyfos | undefined
						if (referencedMapping && referencedMapping.mappingType === MappingSisyfosType.CHANNEL) {
							newChannels.push({
								...channel,
								channel: referencedMapping.channel,
								overridePriority: content.overridePriority || 0,
								isLookahead: layer.isLookahead || false,
								tlObjId: layer.id,
							})
						}
					})
				}
				deviceState.resync = deviceState.resync || content.resync || false
			}

			// Sort by overridePriority, so that those with highest overridePriority will be applied last
			_.each(
				_.sortBy(newChannels, (channel) => channel.overridePriority),
				(newChannel) => {
					if (!deviceState.channels[newChannel.channel]) {
						deviceState.channels[newChannel.channel] = this.getDefaultStateChannel()
					}
					const channel = deviceState.channels[newChannel.channel]

					if (newChannel.isPgm !== undefined) {
						if (newChannel.isLookahead) {
							channel.pstOn = newChannel.isPgm || 0
						} else {
							channel.pgmOn = newChannel.isPgm || 0
						}
					}

					if (newChannel.faderLevel !== undefined) channel.faderLevel = newChannel.faderLevel
					if (newChannel.label !== undefined) channel.label = newChannel.label
					if (newChannel.visible !== undefined) channel.visible = newChannel.visible

					channel.tlObjIds.push(tlObject.id)
				}
			)
		})
		return deviceState
	}
	get deviceType() {
		return DeviceType.SISYFOS
	}
	get deviceName(): string {
		return 'Sisyfos ' + this.deviceId
	}
	get queue() {
		return this._doOnTime.getQueue()
	}
	/**
	 * add the new commands to the queue:
	 * @param commandsToAchieveState
	 * @param time
	 */
	private _addToQueue(commandsToAchieveState: Array<Command>, time: number) {
		_.each(commandsToAchieveState, (cmd: Command) => {
			this._doOnTime.queue(
				time,
				undefined,
				(cmd: Command) => {
					return this._commandReceiver(time, cmd.content, cmd.context, cmd.timelineObjId)
				},
				cmd
			)
		})
	}
	/**
	 * Compares the new timeline-state with the old one, and generates commands to account for the difference
	 */
	private _diffStates(oldOscSendState: SisyfosState, newOscSendState: SisyfosState): Command[] {
		const commands: Command[] = []

		if (newOscSendState.resync && !oldOscSendState.resync) {
			commands.push({
				context: `Resyncing with Sisyfos`,
				content: {
					type: SisyfosCommandType.RESYNC,
				},
				timelineObjId: '',
			})
		}

		_.each(newOscSendState.channels, (newChannel: SisyfosChannel, index) => {
			const oldChannel = oldOscSendState.channels[index]

			if (oldChannel && oldChannel.pgmOn !== newChannel.pgmOn) {
				commands.push({
					context: `Channel ${index} pgm goes from "${oldChannel.pgmOn}" to "${newChannel.pgmOn}"`,
					content: {
						type: SisyfosCommandType.TOGGLE_PGM,
						channel: Number(index),
						value: newChannel.pgmOn,
					},
					timelineObjId: newChannel.tlObjIds[0] || '',
				})
			}

			if (oldChannel && oldChannel.pstOn !== newChannel.pstOn) {
				commands.push({
					context: `Channel ${index} pst goes from "${oldChannel.pstOn}" to "${newChannel.pstOn}"`,
					content: {
						type: SisyfosCommandType.TOGGLE_PST,
						channel: Number(index),
						value: newChannel.pstOn,
					},
					timelineObjId: newChannel.tlObjIds[0] || '',
				})
			}

			if (oldChannel && oldChannel.faderLevel !== newChannel.faderLevel) {
				commands.push({
					context: 'faderLevel change',
					content: {
						type: SisyfosCommandType.SET_FADER,
						channel: Number(index),
						value: newChannel.faderLevel,
					},
					timelineObjId: newChannel.tlObjIds[0] || '',
				})
			}

			newChannel.label = newChannel.label || (oldChannel ? oldChannel.label : '')
			if (oldChannel && newChannel.label !== '' && oldChannel.label !== newChannel.label) {
				commands.push({
					context: 'set label on fader',
					content: {
						type: SisyfosCommandType.LABEL,
						channel: Number(index),
						value: newChannel.label,
					},
					timelineObjId: newChannel.tlObjIds[0] || '',
				})
			}

			if (oldChannel && oldChannel.visible !== newChannel.visible) {
				commands.push({
					context: `Channel ${index} Visibility goes from "${oldChannel.visible}" to "${newChannel.visible}"`,
					content: {
						type: SisyfosCommandType.VISIBLE,
						channel: Number(index),
						value: newChannel.visible,
					},
					timelineObjId: newChannel.tlObjIds[0] || '',
				})
			}
		})

		return commands
	}
	private _defaultCommandReceiver(
		_time: number,
		cmd: SisyfosCommand,
		context: CommandContext,
		timelineObjId: string
	): Promise<any> {
		const cwc: CommandWithContext = {
			context: context,
			command: cmd,
			timelineObjId: timelineObjId,
		}
		this.emit('debug', cwc)

		if (cmd.type === SisyfosCommandType.RESYNC) {
			return this._makeReadyInner(true, true)
		} else {
			try {
				this._sisyfos.send(cmd)

				return Promise.resolve()
			} catch (e) {
				return Promise.reject(e)
			}
		}
	}
	private _connectionChanged() {
		this.emit('connectionChanged', this.getStatus())
	}
}
