import * as _ from 'underscore'
import { EventEmitter } from 'events'
import {
	DeviceWithState,
	CommandWithContext,
	DeviceStatus,
	StatusCode,
	IDevice
} from './device'

import {
	DeviceType,
	Mapping,
	MappingQuantel,
	QuantelOptions,
	TimelineObjQuantelClip,
	QuantelControlMode,
	ResolvedTimelineObjectInstanceExtended,
	QuantelOutTransition,
	QuantelTransitionType,
	DeviceOptionsQuantel
} from '../types/src'

import {
	TimelineState, ResolvedTimelineObjectInstance
} from 'superfly-timeline'

import { DoOnTime, SendMode } from '../doOnTime'
import {
	QuantelGateway,
	Q,
	MonitorPorts
} from 'tv-automation-quantel-gateway-client'

const IDEAL_PREPARE_TIME = 1000
const PREPARE_TIME_WAIT = 50
const SOFT_JUMP_WAIT_TIME = 250

const DEFAULT_FPS = 25 // frames per second
const JUMP_ERROR_MARGIN = 10 // frames

export interface DeviceOptionsQuantelInternal extends DeviceOptionsQuantel {
	options: (
		DeviceOptionsQuantel['options'] &
		{ commandReceiver?: CommandReceiver }
	)
}
export type CommandReceiver = (time: number, cmd: QuantelCommand, context: string, timelineObjId: string) => Promise<any>
/**
 * This class is used to interface with a Quantel-gateway,
 * https://github.com/nrkno/tv-automation-quantel-gateway
 *
 * This device behaves a little bit different than the others, because a play-command is
 * a two-step rocket.
 * This is why the commands generated by the state-diff is not one-to-one related to the
 * actual commands sent to the Quantel-gateway.
 */
export class QuantelDevice extends DeviceWithState<QuantelState> implements IDevice {

	private _quantel: QuantelGateway
	private _quantelManager: QuantelManager

	private _commandReceiver: CommandReceiver

	private _doOnTime: DoOnTime
	private _doOnTimeBurst: DoOnTime
	private _initOptions?: QuantelOptions

	constructor (deviceId: string, deviceOptions: DeviceOptionsQuantelInternal, options) {
		super(deviceId, deviceOptions, options)

		if (deviceOptions.options) {
			if (deviceOptions.options.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
			else this._commandReceiver = this._defaultCommandReceiver
		}
		this._quantel = new QuantelGateway()
		this._quantel.on('error', e => this.emit('error', 'Quantel.QuantelGateway', e))
		this._quantelManager = new QuantelManager(
			this._quantel,
			() => this.getCurrentTime(),
			{
				allowCloneClips: deviceOptions.options.allowCloneClips
			}
		)
		this._quantelManager.on('info', str => this.emit('info', 'Quantel: ' + str))
		this._quantelManager.on('warning', str => this.emit('warning', 'Quantel' + str))
		this._quantelManager.on('error', e => this.emit('error', 'Quantel', e))
		this._quantelManager.on('debug', (...args) => this.emit('debug', ...args))

		this._doOnTime = new DoOnTime(() => {
			return this.getCurrentTime()
		}, SendMode.IN_ORDER, this._deviceOptions)
		this.handleDoOnTime(this._doOnTime, 'Quantel')

		this._doOnTimeBurst = new DoOnTime(() => {
			return this.getCurrentTime()
		}, SendMode.BURST, this._deviceOptions)
		this.handleDoOnTime(this._doOnTimeBurst, 'Quantel.burst')
	}

	async init (initOptions: QuantelOptions): Promise<boolean> {
		this._initOptions = initOptions
		const ISAUrlMaster = this._initOptions.ISAUrlMaster || this._initOptions['ISAUrl'] // tmp: ISAUrl for backwards compatibility, to be removed later
		if (!this._initOptions.gatewayUrl) throw new Error('Quantel bad connection option: gatewayUrl')
		if (!ISAUrlMaster) throw new Error('Quantel bad connection option: ISAUrlMaster')
		if (!this._initOptions.serverId) throw new Error('Quantel bad connection option: serverId')

		await this._quantel.init(
			this._initOptions.gatewayUrl,
			ISAUrlMaster,
			this._initOptions.ISAUrlBackup,
			this._initOptions.zoneId,
			this._initOptions.serverId
		)

		this._quantel.monitorServerStatus((_connected: boolean) => {
			this._connectionChanged()
		})

		return true
	}

	/**
	 * Terminates the device safely such that things can be garbage collected.
	 */
	async terminate (): Promise<boolean> {
		this._quantel.dispose()
		this._doOnTime.dispose()

		return true
	}
	/** Called by the Conductor a bit before a .handleState is called */
	prepareForHandleState (newStateTime: number) {
		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(newStateTime)
		this.cleanUpStates(0, newStateTime)
	}
	/**
	 * Generates an array of Quantel commands by comparing the newState against the oldState, or the current device state.
	 */
	handleState (newState: TimelineState) {
		// check if initialized:
		if (!this._quantel.initialized) {
			this.emit('warning', 'Quantel not initialized yet')
			return
		}

		this._quantel.setMonitoredPorts(this._getMappedPorts())

		let previousStateTime = Math.max(this.getCurrentTime(), newState.time)

		let oldQuantelState: QuantelState = (
			this.getStateBefore(previousStateTime) ||
			{ state: { time: 0, port: {} } }
		).state

		let newQuantelState = this.convertStateToQuantel(newState)
		// let oldQuantelState = this.convertStateToQuantel(oldState)

		let commandsToAchieveState = this._diffStates(oldQuantelState, newQuantelState, newState.time)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)

		// add the new commands to the queue
		this._addToQueue(commandsToAchieveState)

		// store the new state, for later use:
		this.setState(newQuantelState, newState.time)
	}

	/**
	 * Attempts to restart the gateway
	 */
	async restartGateway () {
		if (this._quantel.connected) {
			return this._quantel.kill()
		} else {
			throw new Error('Quantel Gateway not connected')
		}
	}

	/**
	 * Clear any scheduled commands after this time
	 * @param clearAfterTime
	 */
	clearFuture (clearAfterTime: number) {
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}
	get canConnect (): boolean {
		return true
	}
	get connected (): boolean {
		return this._quantel.connected
	}

	get deviceType () {
		return DeviceType.QUANTEL
	}
	get deviceName (): string {
		return `Quantel ${this._quantel.ISAUrl}/${this._quantel.zoneId}/${this._quantel.serverId}`
	}

	get queue () {
		return this._doOnTime.getQueue()
	}
	private _getMappedPorts (): MappedPorts {

		const ports: MappedPorts = {}

		const mappings = this.getMapping()
		_.each(mappings, (mapping) => {
			if (
				mapping &&
				mapping.device === DeviceType.QUANTEL &&
				_.has(mapping,'portId') &&
				_.has(mapping,'channelId')
			) {

				const qMapping: MappingQuantel = mapping as MappingQuantel

				if (!ports[qMapping.portId]) {
					ports[qMapping.portId] = {
						mode: qMapping.mode || QuantelControlMode.QUALITY,
						channels: []
					}
				}

				ports[qMapping.portId].channels = _.sortBy(_.uniq(
					ports[qMapping.portId].channels.concat([qMapping.channelId])
				))
			}
		})
		return ports
	}

	/**
	 * Takes a timeline state and returns a Quantel State that will work with the state lib.
	 * @param timelineState The timeline state to generate from.
	 */
	convertStateToQuantel (timelineState: TimelineState): QuantelState {

		const state: QuantelState = {
			time: timelineState.time,
			port: {}
		}
		// create ports from mappings:

		const mappings = this.getMapping()
		_.each(this._getMappedPorts(), (port, portId: string) => {
			state.port[portId] = {
				channels: port.channels,
				timelineObjId: '',
				mode: port.mode,
				lookahead: false
			}
		})

		_.each(timelineState.layers, (layer: ResolvedTimelineObjectInstance, layerName: string) => {

			const layerExt = layer as ResolvedTimelineObjectInstanceExtended
			let foundMapping: Mapping = mappings[layerName]

			let isLookahead = false
			if (!foundMapping && layerExt.isLookahead && layerExt.lookaheadForLayer) {
				foundMapping = mappings[layerExt.lookaheadForLayer]
				isLookahead = true
			}

			if (
				foundMapping &&
				foundMapping.device === DeviceType.QUANTEL &&
				_.has(foundMapping,'portId') &&
				_.has(foundMapping,'channelId')
			) {

				const mapping: MappingQuantel = foundMapping as MappingQuantel

				const port: QuantelStatePort = state.port[mapping.portId]
				if (!port) throw new Error(`Port "${mapping.portId}" not found`)

				if (layer.content && (layer.content.title || layer.content.guid)) {
					const clip = layer as any as TimelineObjQuantelClip

					const startTime = layer.instance.originalStart || layer.instance.start

					port.timelineObjId = layer.id
					port.notOnAir = layer.content.notOnAir || isLookahead
					port.outTransition = layer.content.outTransition

					port.clip = {
						title: clip.content.title,
						guid: clip.content.guid,
						// clipId // set later

						pauseTime: clip.content.pauseTime,
						playing: (
							isLookahead ? false :
							clip.content.playing !== undefined ? clip.content.playing : true
						),

						inPoint: clip.content.inPoint,
						length: clip.content.length,

						playTime:		(
							clip.content.noStarttime || isLookahead
							?
							null :
							startTime
						) || null
					}
					if (isLookahead) port.lookahead = true
				}
			}
		})

		return state

	}

	/**
	 * Prepares the physical device for playout.
	 * @param okToDestroyStuff Whether it is OK to do things that affects playout visibly
	 */
	async makeReady (okToDestroyStuff?: boolean): Promise<void> {

		if (okToDestroyStuff) {
			// release and re-claim all ports:
			// TODO
		}
		// reset our own state(s):
		if (okToDestroyStuff) {
			this.clearStates()
		}
	}
	getStatus (): DeviceStatus {
		let statusCode = StatusCode.GOOD
		let messages: Array<string> = []

		if (!this._quantel.connected) {
			statusCode = StatusCode.BAD
			messages.push('Not connected')
		}
		if (this._quantel.statusMessage) {
			statusCode = StatusCode.BAD
			messages.push(this._quantel.statusMessage)
		}

		if (!this._quantel.initialized) {
			statusCode = StatusCode.BAD
			messages.push(`Quantel device connection not initialized (restart required)`)
		}

		return {
			statusCode: statusCode,
			messages: messages,
			active: this.isActive
		}
	}
	/**
	 * Compares the new timeline-state with the old one, and generates commands to account for the difference
	 */
	private _diffStates (oldState: QuantelState, newState: QuantelState, time: number): Array<QuantelCommand> {
		const highPrioCommands: QuantelCommand[] = []
		const lowPrioCommands: QuantelCommand[] = []

		const addCommand = (command: QuantelCommand, lowPriority: boolean) => {
			(lowPriority ? lowPrioCommands : highPrioCommands).push(command)
		}

		/** The time of when to run "preparation" commands */
		let prepareTime = Math.min(
			time,
			Math.max(
				time - IDEAL_PREPARE_TIME,
				oldState.time + PREPARE_TIME_WAIT // earliset possible prepareTime
			)
		)
		if (prepareTime < this.getCurrentTime()) { // Only to not emit an unnessesary slowCommand event
			prepareTime = this.getCurrentTime()
		}
		if (time < prepareTime) {
			prepareTime = time - 10
		}

		_.each(newState.port, (newPort: QuantelStatePort, portId: string) => {
			const oldPort = oldState.port[portId]

			if (
				!oldPort ||
				!_.isEqual(newPort.channels, oldPort.channels)
			) {
				const channel = newPort.channels[0] as number | undefined
				if (channel !== undefined) { // todo: support for multiple channels
					addCommand({
						type: QuantelCommandType.SETUPPORT,
						time: prepareTime,
						portId: portId,
						timelineObjId: newPort.timelineObjId,
						channel: channel
					}, newPort.lookahead)

				}
			}

			if (
				!oldPort ||
				!_.isEqual(newPort.clip, oldPort.clip)
			) {
				if (newPort.clip) {
					// Load (and play) the clip:

					let transition: QuantelOutTransition | undefined

					if (oldPort && newPort.notOnAir) {
						// The thing that's going to be played is not intended to be on air
						// We can let the outTransition of the oldCLip run then!
						transition = oldPort.outTransition
					}

					addCommand({
						type: QuantelCommandType.LOADCLIPFRAGMENTS,
						time: prepareTime,
						portId: portId,
						timelineObjId: newPort.timelineObjId,
						fromLookahead: newPort.lookahead,
						clip: newPort.clip,
						timeOfPlay: time
					}, newPort.lookahead)
					if (newPort.clip.playing) {
						addCommand({
							type: QuantelCommandType.PLAYCLIP,
							time: time,
							portId: portId,
							timelineObjId: newPort.timelineObjId,
							fromLookahead: newPort.lookahead,
							clip: newPort.clip,
							mode: newPort.mode,
							transition: transition
						}, newPort.lookahead)
					} else {
						addCommand({
							type: QuantelCommandType.PAUSECLIP,
							time: time,
							portId: portId,
							timelineObjId: newPort.timelineObjId,
							fromLookahead: newPort.lookahead,
							clip: newPort.clip,
							mode: newPort.mode,
							transition: transition
						}, newPort.lookahead)
					}
				} else {
					addCommand({
						type: QuantelCommandType.CLEARCLIP,
						time: time,
						portId: portId,
						timelineObjId: newPort.timelineObjId,
						fromLookahead: newPort.lookahead,
						transition: oldPort && oldPort.outTransition
					}, newPort.lookahead)
				}
			}
		})

		_.each(oldState.port, (oldPort: QuantelStatePort, portId: string) => {
			const newPort = newState.port[portId]
			if (!newPort) {
				// removed port
				addCommand({
					type: QuantelCommandType.RELEASEPORT,
					time: prepareTime,
					portId: portId,
					timelineObjId: oldPort.timelineObjId,
					fromLookahead: oldPort.lookahead
				}, oldPort.lookahead)
			}
		})

		return highPrioCommands.concat(lowPrioCommands)
	}
	private _doCommand (command: QuantelCommand, context: string, timlineObjId: string): Promise<void> {
		let time = this.getCurrentTime()
		return this._commandReceiver(time, command, context, timlineObjId)
	}
	/**
	 * Add commands to queue, to be executed at the right time
	 */
	private _addToQueue (commandsToAchieveState: Array<QuantelCommand>) {
		_.each(commandsToAchieveState, (cmd: QuantelCommand) => {
			this._doOnTime.queue(cmd.time, cmd.portId, (c: {cmd: QuantelCommand}) => {
				return this._doCommand(c.cmd, c.cmd.type + '_' + c.cmd.timelineObjId, c.cmd.timelineObjId)
			}, { cmd: cmd })

			this._doOnTimeBurst.queue(cmd.time, undefined, (c: {cmd: QuantelCommand}) => {
				if (
					(
						c.cmd.type === QuantelCommandType.PLAYCLIP ||
						c.cmd.type === QuantelCommandType.PAUSECLIP
					) &&
					!c.cmd.fromLookahead
				) {
					this._quantelManager.clearAllWaitWithPort(c.cmd.portId)
				}
				return Promise.resolve()
			}, { cmd: cmd })
		})

	}
	/**
	 * Sends commands to the Quantel ISA server
	 * @param time deprecated
	 * @param cmd Command to execute
	 */
	private async _defaultCommandReceiver (_time: number, cmd: QuantelCommand, context: string, timelineObjId: string): Promise<any> {

		let cwc: CommandWithContext = {
			context: context,
			timelineObjId: timelineObjId,
			command: cmd
		}
		this.emit('debug', cwc)

		try {

			if (cmd.type === QuantelCommandType.SETUPPORT) {
				await this._quantelManager.setupPort(cmd)
			} else if (cmd.type === QuantelCommandType.RELEASEPORT) {
				await this._quantelManager.releasePort(cmd)
			} else if (cmd.type === QuantelCommandType.LOADCLIPFRAGMENTS) {
				await this._quantelManager.loadClipFragments(cmd)
			} else if (cmd.type === QuantelCommandType.PLAYCLIP) {
				await this._quantelManager.playClip(cmd)
			} else if (cmd.type === QuantelCommandType.PAUSECLIP) {
				await this._quantelManager.pauseClip(cmd)
			} else if (cmd.type === QuantelCommandType.CLEARCLIP) {
				await this._quantelManager.clearClip(cmd)
				this.getCurrentTime()
			} else {
				// @ts-ignore never
				throw new Error(`Unsupported command type "${cmd.type}"`)
			}
		} catch (error) {
			let errorString = (
				error && error.message ?
				error.message :
				error.toString()
			)
			this.emit('commandError', new Error(errorString), cwc)
		}
	}
	private _connectionChanged () {
		this.emit('connectionChanged', this.getStatus())
	}
}
interface QuantelManagerOptions {
	/** If set: If a clip turns out to be on the wrong server, an attempt to copy the clip will be done. */
	allowCloneClips?: boolean
}
class QuantelManager extends EventEmitter {
	private _quantelState: QuantelTrackedState = {
		port: {}
	}
	private _cache = new Cache()
	private _waitWithPorts: {
		[portId: string]: Function[]
	} = {}
	constructor (
		private _quantel: QuantelGateway,
		private getCurrentTime: () => number,
		private options: QuantelManagerOptions
	) {
		super()
		this._quantel.on('error', (...args) => this.emit('error', ...args))
		this._quantel.on('debug', (...args) => this.emit('debug', ...args))
	}

	public async setupPort (cmd: QuantelCommandSetupPort): Promise<void> {
		const trackedPort = this._quantelState.port[cmd.portId]

		// Check if the port is already set up
		if (
			!trackedPort ||
			trackedPort.channel !== cmd.channel
		) {
			let port: Q.PortStatus | null = null
			// Setup a port and connect it to a channel
			try {
				port = await this._quantel.getPort(cmd.portId)
			} catch (e) {
				// If the GET fails, it might be something unknown wrong.
				// A temporary workaround is to send a delete on that port and try again, it might work.
				try {
					await this._quantel.releasePort(cmd.portId)
				} catch {
					// ignore any errors
				}
				// Try again:
				port = await this._quantel.getPort(cmd.portId)
			}
			if (port) {
				// port already exists, release it first:
				await this._quantel.releasePort(cmd.portId)
			}
			await this._quantel.createPort(cmd.portId, cmd.channel)

			// Store to the local tracking state:
			this._quantelState.port[cmd.portId] = {
				loadedFragments: {},
				offset: -1,
				playing: false,
				jumpOffset: null,
				scheduledStop: null,
				channel: cmd.channel
			}
		}
	}
	public async releasePort (cmd: QuantelCommandReleasePort): Promise<void> {
		try {
			await this._quantel.releasePort(cmd.portId)
		} catch (e) {
			if (e.status !== 404) { // releasing a non-existent port is OK
				throw e
			}
		}
		// Store to the local tracking state:
		delete this._quantelState.port[cmd.portId]
	}
	public async loadClipFragments (cmd: QuantelCommandLoadClipFragments): Promise<void> {

		const trackedPort = this.getTrackedPort(cmd.portId)

		const server = await this.getServer()

		let clipId: number = 0
		try {
			clipId = await this.getClipId(cmd.clip)
		} catch (e) {
			if ((e + '').match(/not found/i)) {
				// The clip was not found
				if (this.options.allowCloneClips) {
					// Try to clone the clip from another server:

					if (!server.pools) throw new Error(`server.pools not set!`)

					// find another clip
					const clips = await this.searchForClips(cmd.clip)
					if (clips.length) {
						const clipToCloneFrom = clips[0]

						const cloneResult: Q.CloneResult = await this._quantel.copyClip(
							undefined, // source zoneId. inter-zone copying not supported atm.
							clipToCloneFrom.ClipID,
							server.pools[0] // pending discussion, which to choose
						)
						clipId = cloneResult.copyID // new clip id
					} else throw e
				} else throw e
			} else throw e
		}

		// let clipId = await this.getClipId(cmd.clip)
		let clipData = await this._quantel.getClip(clipId)
		if (!clipData) throw new Error(`Clip ${clipId} not found`)
		if (!clipData.PoolID) throw new Error(`Clip ${clipData.ClipID} missing PoolID`)

		// Check that the clip is present on the server:
		if (!(server.pools || []).includes(clipData.PoolID)) {
			throw new Error(`Clip "${clipData.ClipID}" PoolID ${clipData.PoolID} not found on right server (${server.ident})`)
		}

		let useInOutPoints: boolean = !!(
			cmd.clip.inPoint ||
			cmd.clip.length
		)

		let inPoint = cmd.clip.inPoint
		let length = cmd.clip.length

		/** In point [frames] */
		const inPointFrames: number = (
			inPoint ?
			Math.round(inPoint * DEFAULT_FPS / 1000) : // todo: handle fps, get it from clip?
			0
		) || 0

		/** Duration [frames] */
		let lengthFrames: number = (
			length ?
			Math.round(length * DEFAULT_FPS / 1000) : // todo: handle fps, get it from clip?
			0
		) || parseInt(clipData.Frames, 10) || 0

		if (inPoint && !length) {
			lengthFrames -= inPointFrames
		}

		const outPointFrames = inPointFrames + lengthFrames

		let portInPoint: number
		let portOutPoint: number
		// Check if the fragments are already loaded on the port?
		const loadedFragments = trackedPort.loadedFragments[clipId]
		if (
			loadedFragments &&
			loadedFragments.inPoint === inPointFrames &&
			loadedFragments.outPoint === outPointFrames
		) {
			// Reuse the already loaded fragment:
			portInPoint = loadedFragments.portInPoint
			// portOutPoint = loadedFragments.portOutPoint
		} else {
			// Fetch fragments of clip:
			const fragmentsInfo = await (
				useInOutPoints ?
				this._quantel.getClipFragments(clipId, inPointFrames, outPointFrames) :
				this._quantel.getClipFragments(clipId)
			)

			// Check what the end-frame of the port is:
			const portStatus = await this._quantel.getPort(cmd.portId)
			if (!portStatus) throw new Error(`Port ${cmd.portId} not found`)
			// Load the fragments onto Port:
			portInPoint = portStatus.endOfData || 0
			const newPortStatus = await this._quantel.loadFragmentsOntoPort(cmd.portId, fragmentsInfo.fragments, portInPoint)
			if (!newPortStatus) throw new Error(`Port ${cmd.portId} not found after loading fragments`)

			// Calculate the end of data of the fragments:
			portOutPoint = portInPoint + (
				fragmentsInfo.fragments
				.filter(fragment => (
					fragment.type === 'VideoFragment' && // Only use video, so that we don't risk ending at a black frame
					fragment.trackNum === 0 // < 0 are historic data (not used for automation), 0 is the normal, playable video track, > 0 are extra channels, such as keys
				))
				.reduce((prev, current) => prev > current.finish ? prev : current.finish, 0) - 1 // newPortStatus.endOfData - 1
			)

			// Store a reference to the beginning of the fragments:
			trackedPort.loadedFragments[clipId] = {
				portInPoint: portInPoint,
				portOutPoint: portOutPoint,
				inPoint: inPointFrames,
				outPoint: outPointFrames
			}
		}
		// Prepare the jump?
		let timeLeftToPlay = cmd.timeOfPlay - this.getCurrentTime()
		if (timeLeftToPlay > 0) { // We have time to prepare the jump

			if (portInPoint > 0 && trackedPort.scheduledStop === null) {
				// Since we've now added fragments to the end of the port timeline, we should make sure it'll stop at the previous end
				await this._quantel.portStop(cmd.portId, portInPoint - 1)
				trackedPort.scheduledStop = portInPoint - 1
			}

			await this._quantel.portPrepareJump(cmd.portId, portInPoint)
			// Store the jump in the tracked state:
			trackedPort.jumpOffset = portInPoint
		}
	}
	public async playClip (cmd: QuantelCommandPlayClip): Promise<void> {
		await this.prepareClipJump(cmd, 'play')
	}
	public async pauseClip (cmd: QuantelCommandPauseClip): Promise<void> {
		await this.prepareClipJump(cmd, 'pause')
	}
	public async clearClip (cmd: QuantelCommandClearClip): Promise<void> {

		// Fetch tracked reference to the loaded clip:
		const trackedPort = this.getTrackedPort(cmd.portId)
		if (cmd.transition) {
			if (cmd.transition.type === QuantelTransitionType.DELAY) {
				if (await this.waitWithPort(cmd.portId, cmd.transition.delay)) {
					// at this point, the wait aws aborted by someone else. Do nothing then.
					return
				}
			}
		}
		// Reset the port (this will clear all fragments and reset playhead)
		await this._quantel.resetPort(cmd.portId)

		trackedPort.loadedFragments = {}
		trackedPort.offset = -1
		trackedPort.playing = false
		trackedPort.jumpOffset = null
		trackedPort.scheduledStop = null
	}
	private async prepareClipJump (cmd: QuantelCommandClip, alsoDoAction?: 'play' | 'pause'): Promise<void> {

		// Fetch tracked reference to the loaded clip:
		const trackedPort = this.getTrackedPort(cmd.portId)
		if (cmd.transition) {
			if (cmd.transition.type === QuantelTransitionType.DELAY) {
				if (await this.waitWithPort(cmd.portId, cmd.transition.delay)) {
					// at this point, the wait aws aborted by someone else. Do nothing then.
					return
				}
			}
		}

		const clipId = await this.getClipId(cmd.clip)
		const loadedFragments = trackedPort.loadedFragments[clipId]

		if (!loadedFragments) {
			// huh, the fragments hasn't been loaded
			throw new Error(`Fragments of clip ${clipId} wasn't loaded`)
		}
		const clipFps = DEFAULT_FPS // todo: handle fps, get it from clip?
		const jumpToOffset = Math.floor(
			loadedFragments.portInPoint + (
				cmd.clip.playTime ?
				Math.max(0, (cmd.clip.pauseTime || this.getCurrentTime()) - cmd.clip.playTime) * clipFps / 1000 :
				0
			)
		)
		if (
			jumpToOffset === trackedPort.offset || // We're already there
			(
				alsoDoAction === 'play' &&
				// trackedPort.offset &&
				jumpToOffset > trackedPort.offset &&
				jumpToOffset - trackedPort.offset < JUMP_ERROR_MARGIN
				// We're probably a bit late, just start playing
			)
		) {
			// do nothing
		} else {

			if (
				trackedPort.jumpOffset !== null &&
				Math.abs(trackedPort.jumpOffset - jumpToOffset) > JUMP_ERROR_MARGIN
			) {
				// It looks like the stored jump is no longer valid
				// Invalidate stored jump:
				trackedPort.jumpOffset = null
			}
			// Jump the port playhead to the correct place
			if (trackedPort.jumpOffset !== null) {
				// Good, there is a prepared jump
				if (alsoDoAction === 'pause') {
					// Pause the playback:
					await this._quantel.portStop(cmd.portId)
					trackedPort.scheduledStop = null
					trackedPort.playing = false
				}
				// Trigger the jump:
				await this._quantel.portTriggerJump(cmd.portId)
				trackedPort.offset = trackedPort.jumpOffset
				trackedPort.jumpOffset = null
			} else {
				// No jump has been prepared
				if (cmd.mode === QuantelControlMode.QUALITY) {

					// Prepare a soft jump:
					await this._quantel.portPrepareJump(cmd.portId, jumpToOffset)
					trackedPort.jumpOffset = jumpToOffset

					if (alsoDoAction === 'pause') {
						// Pause the playback:
						await this._quantel.portStop(cmd.portId)
						trackedPort.scheduledStop = null
						trackedPort.playing = false

						// Allow the server some time to load the clip:
						await this.wait(SOFT_JUMP_WAIT_TIME) // This is going to give the
					} else {
						// Allow the server some time to load the clip:
						await this.wait(SOFT_JUMP_WAIT_TIME) // This is going to give the
					}

					// Trigger the jump:
					await this._quantel.portTriggerJump(cmd.portId)
					trackedPort.offset = trackedPort.jumpOffset
					trackedPort.jumpOffset = null

				} else { // cmd.mode === QuantelControlMode.SPEED
					// Just do a hard jump:
					await this._quantel.portHardJump(cmd.portId, jumpToOffset)

					trackedPort.offset = jumpToOffset
					trackedPort.playing = false
				}
			}
		}

		if (alsoDoAction === 'play') {
			// Start playing:
			await this._quantel.portPlay(cmd.portId)

			await this.wait(60)

			// Check if the play actually succeeded:
			const portStatus = await this._quantel.getPort(cmd.portId)

			if (!portStatus) {
				// oh, something's gone very wrong
				throw new Error(`Quantel: After play, port doesn't exist anymore`)
			} else if (!portStatus.status.match(/playing/i)) {
				// The port didn't seem to have started playing, let's retry a few more times:

				this.emit('warning', `quantelRecovery: port didn't play`)
				this.emit('warning', portStatus)

				for (let i = 0; i < 3; i++) {
					await this.wait(20)

					await this._quantel.portPlay(cmd.portId)

					await this.wait(60 + i * 200) // Wait progressively longer times before trying again:

					const portStatus = await this._quantel.getPort(cmd.portId)

					if (portStatus && portStatus.status.match(/playing/i)) {
						// it has started playing, all good!
						this.emit('warning', `quantelRecovery: port started playing again, on try ${i}`)
						break
					} else {
						this.emit('warning', `quantelRecovery: try ${i}, no luck trying again..`)
						this.emit('warning', portStatus)
					}
				}
			}
			trackedPort.scheduledStop = null
			trackedPort.playing = true

			// Schedule the port to stop at the last frame of the clip
			if (loadedFragments.portOutPoint) {
				await this._quantel.portStop(cmd.portId, loadedFragments.portOutPoint)
				trackedPort.scheduledStop = loadedFragments.portOutPoint
			}
		} else if (
			alsoDoAction === 'pause' &&
			trackedPort.playing
		) {
			await this._quantel.portHardJump(cmd.portId, jumpToOffset)

			trackedPort.offset = jumpToOffset
			trackedPort.playing = false
		}
	}
	private getTrackedPort (portId: string): QuantelTrackedStatePort {
		const trackedPort = this._quantelState.port[portId]
		if (!trackedPort) {
			// huh, it looks like the port hasn't been created yet.
			// This is strange, it should have been created by a previously run SETUPPORT
			throw new Error(`Port ${portId} missing in tracked quantel state`)
		}
		return trackedPort
	}
	private async getServer () {
		const server = await this._quantel.getServer()
		if (!server) throw new Error(`Quantel server ${this._quantel.serverId} not found`)
		if (!server.pools) throw new Error(`Server ${server.ident} has no .pools`)
		if (!server.pools.length) throw new Error(`Server ${server.ident} has an empty .pools array`)

		return server
	}
	private async getClipId (clip: QuantelStatePortClip): Promise<number> {
		let clipId = clip.clipId

		if (!clipId && clip.guid) {
			clipId = await this._cache.getSet(`clip.guid.${clip.guid}.clipId`, async () => {

				const server = await this.getServer()

				// Look up the clip:
				const foundClips = await this.searchForClips(clip)
				const foundClip = _.find(foundClips, (clip) => {
					return (
						clip.PoolID &&
						(server.pools || []).indexOf(clip.PoolID) !== -1
					)
				})
				if (!foundClip) throw new Error(`Clip with GUID "${clip.guid}" not found on server (${server.ident})`)
				return foundClip.ClipID
			})
		} else if (!clipId && clip.title) {
			clipId = await this._cache.getSet(`clip.title.${clip.title}.clipId`, async () => {

				const server = await this.getServer()

				// Look up the clip:
				const foundClips = await this.searchForClips(clip)
				const foundClip = _.find(foundClips, (clip) => {
					return (
						clip.PoolID &&
						(server.pools || []).indexOf(clip.PoolID) !== -1
					)
				})
				if (!foundClip) throw new Error(`Clip with Title "${clip.title}" not found on server (${server.ident})`)
				return foundClip.ClipID
			})
		}
		if (!clipId) throw new Error(`Unable to determine clipId for clip "${clip.title || clip.guid}"`)

		return clipId
	}
	private async searchForClips (clip: QuantelStatePortClip): Promise<Q.ClipDataSummary[]> {
		if (clip.guid) {
			return this._quantel.searchClip({
				ClipGUID: `"${clip.guid}"`
			})
		} else if (clip.title) {
			return this._quantel.searchClip({
				Title: `"${clip.title}"`
			})
		} else {
			throw new Error(`Unable to search for clip "${clip.title || clip.guid}"`)
		}
	}
	private wait (time: number) {
		return new Promise(resolve => {
			setTimeout(resolve, time)
		})
	}
	public clearAllWaitWithPort (portId: string) {
		if (!this._waitWithPorts[portId]) {
			_.each(this._waitWithPorts[portId], fcn => {
				fcn(true)
			})
		}
	}
	/**
	 * Returns true if the wait was cleared from someone else
	 */
	private waitWithPort (portId: string, delay: number): Promise<boolean> {

		return new Promise(resolve => {
			if (!this._waitWithPorts[portId]) this._waitWithPorts[portId] = []
			this._waitWithPorts[portId].push(resolve)
			setTimeout(() => {
				resolve(false)
			}, delay || 0)
		})
	}
}
class Cache {
	private data: {[key: string]: {
		endTime: number
		value: any
	}} = {}
	private callCount: number = 0
	set (key: string, value: any, ttl: number = 30000): any {
		this.data[key] = {
			endTime: Date.now() + ttl,
			value: value
		}
		this.callCount++
		if (this.callCount > 100) {
			this.callCount = 0
			this._triggerClean()
		}
		return value
	}
	get (key: string): any | undefined {
		const o = this.data[key]
		if (o && (o.endTime || 0) >= Date.now()) return o.value
	}
	exists (key: string): boolean {
		const o = this.data[key]
		return (o && (o.endTime || 0) >= Date.now())
	}
	getSet<T extends any> (key, fcn: () => T, ttl?: number): T {
		if (this.exists(key)) {
			return this.get(key)
		} else {
			let value = fcn()
			if (value && _.isObject(value) && _.isFunction(value['then'])) {
				// value is a promise
				return (
					Promise.resolve(value)
					.then((value) => {
						return this.set(key, value, ttl)
					})
				) as any as T
			} else {
				return this.set(key, value, ttl)
			}
		}
	}
	private _triggerClean () {
		setTimeout(() => {
			_.each(this.data, (o, key) => {
				if ((o.endTime || 0) < Date.now()) {
					delete this.data[key]
				}
			})
		}, 1)
	}
}

interface QuantelState {
	time: number
	port: {
		[portId: string]: QuantelStatePort
	}
}
interface QuantelStatePort {
	timelineObjId: string
	clip?: QuantelStatePortClip
	mode: QuantelControlMode

	lookahead: boolean

	channels: number[]

	notOnAir?: boolean
	outTransition?: QuantelOutTransition
}
interface QuantelStatePortClip {
	title?: string
	guid?: string

	clipId?: number

	playing: boolean
	playTime: number | null
	pauseTime?: number

	inPoint?: number
	length?: number
}

interface QuantelCommandBase {
	time: number
	type: QuantelCommandType
	portId: string
	timelineObjId: string
	fromLookahead?: boolean
}
export enum QuantelCommandType {
	SETUPPORT = 'setupPort',
	LOADCLIPFRAGMENTS = 'loadClipFragments',
	PLAYCLIP = 'playClip',
	PAUSECLIP = 'pauseClip',
	CLEARCLIP = 'clearClip',
	RELEASEPORT = 'releasePort'
}
interface QuantelCommandSetupPort extends QuantelCommandBase {
	type: QuantelCommandType.SETUPPORT
	channel: number // todo later: support for multiple channels
}
interface QuantelCommandLoadClipFragments extends QuantelCommandBase {
	type: QuantelCommandType.LOADCLIPFRAGMENTS
	clip: QuantelStatePortClip
	/** The time the clip is scheduled to play */
	timeOfPlay: number
}
interface QuantelCommandClip extends QuantelCommandBase {
	clip: QuantelStatePortClip
	mode: QuantelControlMode
	transition?: QuantelOutTransition
}
interface QuantelCommandPlayClip extends QuantelCommandClip {
	type: QuantelCommandType.PLAYCLIP
}
interface QuantelCommandPauseClip extends QuantelCommandClip {
	type: QuantelCommandType.PAUSECLIP
}
interface QuantelCommandClearClip extends QuantelCommandBase {
	type: QuantelCommandType.CLEARCLIP
	transition?: QuantelOutTransition
}
interface QuantelCommandReleasePort extends QuantelCommandBase {
	type: QuantelCommandType.RELEASEPORT

}

type QuantelCommand = QuantelCommandSetupPort |
	QuantelCommandLoadClipFragments |
	QuantelCommandPlayClip |
	QuantelCommandPauseClip |
	QuantelCommandClearClip |
	QuantelCommandReleasePort

/** Tracked state of an ISA-Zone-Server entity */
interface QuantelTrackedState {
	port: {
		[portId: string]: QuantelTrackedStatePort
	}
}
interface QuantelTrackedStatePort {
	/** Reference to the latest loaded fragments of a clip  */
	loadedFragments: {
		[clipId: number]: {
			/** The point (in a port) where the fragments starts [frames] */
			portInPoint: number
			/** The point (in a port) where the fragments ends [frames] */
			portOutPoint: number

			/** The inpoint used when loading the fragments */
			inPoint: number
			/** The outpoint used when loading the fragments */
			outPoint: number
		}
	}
	/** The (SDI)-output channel the port is using */
	channel: number

	/** The current offset of the playhead (only valid when not playing) */
	offset: number
	/** If the playhead is playing or not */
	playing: boolean
	/** When preparing a jump, this is the frame the cursor is set to  */
	jumpOffset: number | null
	/** When preparing a stop, this is the frame the playhead will stop at */
	scheduledStop: number | null
}
interface MappedPorts extends MonitorPorts {
	[portId: string]: {
		mode: QuantelControlMode,
		channels: number[]
	}
}
