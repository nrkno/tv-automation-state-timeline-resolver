import _ from 'underscore'
import { DeviceWithState, CommandWithContext, DeviceStatus, StatusCode, IDevice } from './device'
import {
	DeviceType,
	TimelineObjPanasonicPtzPreset,
	TimelineObjPanasonicPtzPresetSpeed,
	TimelineObjPanasonicPtzZoomSpeed,
	TimelineObjPanasonicPtzZoom,
	TimelineContentTypePanasonicPtz,
	MappingPanasonicPtz,
	MappingPanasonicPtzType,
	PanasonicPTZOptions,
	DeviceOptionsPanasonicPTZ,
	Mappings,
} from '../types/src'
import { TimelineState, ResolvedTimelineObjectInstance } from 'superfly-timeline'
import { DoOnTime, SendMode } from '../doOnTime'
import { PanasonicPtzHttpInterface } from './panasonicPTZAPI'

export interface DeviceOptionsPanasonicPTZInternal extends DeviceOptionsPanasonicPTZ {
	options: DeviceOptionsPanasonicPTZ['options'] & { commandReceiver?: CommandReceiver }
}
export type CommandReceiver = (
	time: number,
	cmd: PanasonicPtzCommand,
	context: CommandContext,
	timelineObjId: string
) => Promise<any>

export interface PanasonicPtzState {
	speed?: {
		value: number
		timelineObjId: string
	}
	preset?: {
		value: number
		timelineObjId: string
	}
	zoomSpeed?: {
		value: number
		timelineObjId: string
	}
	zoom?: {
		value: number
		timelineObjId: string
	}
}

export interface PanasonicPtzCommand {
	type: TimelineContentTypePanasonicPtz
	speed?: number
	preset?: number
	zoomSpeed?: number // -1 is full speed WIDE, +1 is full speed TELE, 0 is stationary
	zoom?: number // 0 is WIDE, 1 is TELE
}
export interface PanasonicPtzCommandWithContext {
	command: PanasonicPtzCommand
	context: CommandContext
	timelineObjId: string
}
type CommandContext = any

const PROBE_INTERVAL = 10 * 1000 // Probe every 10s
/**
 * A wrapper for panasonic ptz cameras. Maps timeline states to device states and
 * executes commands to achieve such states. Depends on PanasonicPTZAPI class for
 * connection with the physical device.
 */
export class PanasonicPtzDevice extends DeviceWithState<PanasonicPtzState> implements IDevice {
	private _doOnTime: DoOnTime
	private _device: PanasonicPtzHttpInterface | undefined
	private _connected = false

	private _commandReceiver: CommandReceiver

	constructor(
		deviceId: string,
		deviceOptions: DeviceOptionsPanasonicPTZInternal,
		getCurrentTime: () => Promise<number>
	) {
		super(deviceId, deviceOptions, getCurrentTime)
		if (deviceOptions.options?.commandReceiver) {
			this._commandReceiver = deviceOptions.options.commandReceiver
		} else {
			this._commandReceiver = this._defaultCommandReceiver
		}

		this._doOnTime = new DoOnTime(
			() => {
				return this.getCurrentTime()
			},
			SendMode.BURST,
			this._deviceOptions
		)
		this.handleDoOnTime(this._doOnTime, 'PanasonicPTZ')

		if (deviceOptions.options && deviceOptions.options.host) {
			// set up connection class
			this._device = new PanasonicPtzHttpInterface(
				deviceOptions.options.host,
				deviceOptions.options.port,
				deviceOptions.options.https
			)
			this._device.on('error', (msg) => {
				if (msg.code === 'ECONNREFUSED') return // ignore, since we catch this in connection logic
				this.emit('error', 'PanasonicPtzHttpInterface', msg)
			})
			this._device.on('disconnected', () => {
				this._setConnected(false)
			})
			this._device.on('debug', (...args) => {
				this.emit('debug', 'Panasonic PTZ', ...args)
			})
		} else {
			this._device = undefined
		}
	}

	/**
	 * Initiates the device: set up ping for connection logic.
	 */
	init(_initOptions: PanasonicPTZOptions): Promise<boolean> {
		if (this._device) {
			return new Promise((resolve, reject) => {
				setInterval(() => {
					this._device!.ping()
						.then((result) => {
							this._setConnected(!!result)
						})
						.catch(() => {
							this._setConnected(false)
						})
				}, PROBE_INTERVAL)

				this._device!.ping()
					.then((result) => {
						this._setConnected(!!result)

						resolve(true)
					})
					.catch((e) => {
						reject(e)
					})
			})
		}
		return Promise.reject('There are no cameras set up for this device')
	}

	/**
	 * Converts a timeline state into a device state.
	 * @param state
	 */
	convertStateToPtz(state: TimelineState, mappings: Mappings): PanasonicPtzState {
		// convert the timeline state into something we can use
		const ptzState: PanasonicPtzState = this._getDefaultState()

		_.each(state.layers, (tlObject: ResolvedTimelineObjectInstance, layerName: string) => {
			const mapping: MappingPanasonicPtz | undefined = mappings[layerName] as MappingPanasonicPtz
			if (mapping && mapping.device === DeviceType.PANASONIC_PTZ && mapping.deviceId === this.deviceId) {
				if (mapping.mappingType === MappingPanasonicPtzType.PRESET) {
					const tlObjectSource = (tlObject as any) as TimelineObjPanasonicPtzPreset
					ptzState.preset = {
						value: tlObjectSource.content.preset,
						timelineObjId: tlObject.id,
					}
				} else if (mapping.mappingType === MappingPanasonicPtzType.PRESET_SPEED) {
					const tlObjectSource = (tlObject as any) as TimelineObjPanasonicPtzPresetSpeed
					ptzState.speed = {
						value: tlObjectSource.content.speed,
						timelineObjId: tlObject.id,
					}
				} else if (mapping.mappingType === MappingPanasonicPtzType.ZOOM_SPEED) {
					const tlObjectSource = (tlObject as any) as TimelineObjPanasonicPtzZoomSpeed
					ptzState.zoomSpeed = {
						value: tlObjectSource.content.zoomSpeed,
						timelineObjId: tlObject.id,
					}
				} else if (mapping.mappingType === MappingPanasonicPtzType.ZOOM) {
					const tlObjectSource = (tlObject as any) as TimelineObjPanasonicPtzZoom
					ptzState.zoom = {
						value: tlObjectSource.content.zoom,
						timelineObjId: tlObject.id,
					}
				}
			}
		})

		return ptzState
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
		// Create device states
		const previousStateTime = Math.max(this.getCurrentTime(), newState.time)
		const oldPtzState: PanasonicPtzState = (
			this.getStateBefore(previousStateTime) || { state: this._getDefaultState() }
		).state

		const newPtzState = this.convertStateToPtz(newState, newMappings)

		// Generate commands needed to reach new state
		const commandsToAchieveState: Array<PanasonicPtzCommandWithContext> = this._diffStates(oldPtzState, newPtzState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)
		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newPtzState, newState.time)
	}

	clearFuture(clearAfterTime: number) {
		// Clear any scheduled commands after this time
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}
	terminate() {
		if (this._device) {
			this._device.dispose()
		}
		return Promise.resolve(true)
	}
	getStatus(): DeviceStatus {
		let statusCode = StatusCode.GOOD
		const messages: Array<string> = []

		if (!this._connected) {
			statusCode = StatusCode.BAD
			messages.push('Not connected')
		}

		return {
			statusCode: statusCode,
			messages: messages,
			active: this.isActive,
		}
	}
	private _getDefaultState(): PanasonicPtzState {
		return {
			// preset: undefined,
			// speed: undefined,
			zoomSpeed: {
				value: 0,
				timelineObjId: 'default',
			},
			// zoom: undefined
		}
	}

	private async _defaultCommandReceiver(
		_time: number,
		cmd: PanasonicPtzCommand,
		context: CommandContext,
		timelineObjId: string
	): Promise<any> {
		const cwc: CommandWithContext = {
			context: context,
			command: cmd,
			timelineObjId: timelineObjId,
		}
		try {
			if (this._device) {
				if (cmd.type === TimelineContentTypePanasonicPtz.PRESET) {
					// recall preset
					if (cmd.preset !== undefined) {
						const res = await this._device.recallPreset(cmd.preset)
						this.emit('debug', `Panasonic PTZ result: ${res}`)
					} else throw new Error(`Bad parameter: preset`)
				} else if (cmd.type === TimelineContentTypePanasonicPtz.SPEED) {
					// set speed
					if (cmd.speed !== undefined) {
						const res = await this._device.setSpeed(cmd.speed)
						this.emit('debug', `Panasonic PTZ result: ${res}`)
					} else throw new Error(`Bad parameter: speed`)
				} else if (cmd.type === TimelineContentTypePanasonicPtz.ZOOM_SPEED) {
					// set zoom speed
					if (cmd.zoomSpeed !== undefined) {
						// scale -1 - 0 - +1 range to 01 - 50 - 99 range
						const res = await this._device.setZoomSpeed(cmd.zoomSpeed * 49 + 50)
						this.emit('debug', `Panasonic PTZ result: ${res}`)
					} else throw new Error(`Bad parameter: zoomSpeed`)
				} else if (cmd.type === TimelineContentTypePanasonicPtz.ZOOM) {
					// set zoom
					if (cmd.zoom !== undefined) {
						// scale 0 - +1 range to 555h - FFFh range
						const res = await this._device.setZoom(cmd.zoom * 0xaaa + 0x555)
						this.emit('debug', `Panasonic PTZ result: ${res}`)
					} else throw new Error(`Bad parameter: zoom`)
				} else throw new Error(`PTZ: Unknown type: "${cmd.type}"`)
			} else throw new Error(`PTZ device not set up`)
		} catch (e) {
			this.emit('commandError', e, cwc)
		}
	}

	/**
	 * Add commands to queue, to be executed at the right time
	 */
	private _addToQueue(commandsToAchieveState: Array<PanasonicPtzCommandWithContext>, time: number) {
		_.each(commandsToAchieveState, (cmd: PanasonicPtzCommandWithContext) => {
			// add the new commands to the queue:
			this._doOnTime.queue(
				time,
				undefined,
				(cmd: PanasonicPtzCommandWithContext) => {
					return this._commandReceiver(time, cmd.command, cmd.context, cmd.timelineObjId)
				},
				cmd
			)
		})
	}
	/**
	 * Compares the new timeline-state with the old one, and generates commands to account for the difference
	 */
	private _diffStates(
		oldPtzState: PanasonicPtzState,
		newPtzState: PanasonicPtzState
	): Array<PanasonicPtzCommandWithContext> {
		const commands: Array<PanasonicPtzCommandWithContext> = []

		const addCommands = (newNode: PanasonicPtzState, oldValue: PanasonicPtzState) => {
			if (
				newNode.preset &&
				this.getValue(newNode.preset) !== this.getValue(oldValue.preset) &&
				this.getValue(newNode.preset) !== undefined
			) {
				commands.push({
					command: {
						type: TimelineContentTypePanasonicPtz.PRESET,
						preset: this.getValue(newNode.preset),
					},
					context: `preset differ (${this.getValue(newNode.preset)}, ${this.getValue(oldValue.preset)})`,
					timelineObjId: newNode.preset.timelineObjId,
				})
			}
			if (
				newNode.speed &&
				this.getValue(newNode.speed) !== this.getValue(oldValue.speed) &&
				this.getValue(newNode.speed) !== undefined
			) {
				commands.push({
					command: {
						type: TimelineContentTypePanasonicPtz.SPEED,
						speed: this.getValue(newNode.speed),
					},
					context: `speed differ (${this.getValue(newNode.speed)}, ${this.getValue(oldValue.speed)})`,
					timelineObjId: newNode.speed.timelineObjId,
				})
			}
			if (
				newNode.zoomSpeed &&
				this.getValue(newNode.zoomSpeed) !== this.getValue(oldValue.zoomSpeed) &&
				this.getValue(newNode.zoomSpeed) !== undefined
			) {
				commands.push({
					command: {
						type: TimelineContentTypePanasonicPtz.ZOOM_SPEED,
						speed: this.getValue(newNode.zoomSpeed),
					},
					context: `zoom speed differ (${this.getValue(newNode.zoomSpeed)}, ${this.getValue(
						oldValue.zoomSpeed
					)})`,
					timelineObjId: newNode.zoomSpeed.timelineObjId,
				})
			}
			if (
				newNode.zoom &&
				this.getValue(newNode.zoom) !== this.getValue(oldValue.zoom) &&
				this.getValue(newNode.zoom) !== undefined
			) {
				commands.push({
					command: {
						type: TimelineContentTypePanasonicPtz.ZOOM,
						zoom: this.getValue(newNode.zoom),
					},
					context: `zoom differ (${this.getValue(newNode.zoom)}, ${this.getValue(oldValue.zoom)})`,
					timelineObjId: newNode.zoom.timelineObjId,
				})
			}
		}

		if (!_.isEqual(newPtzState, oldPtzState)) {
			addCommands(newPtzState, oldPtzState)
		}
		return commands
	}

	get canConnect(): boolean {
		return true
	}
	get connected(): boolean {
		return this._connected
	}
	get deviceType() {
		return DeviceType.PANASONIC_PTZ
	}
	get deviceName(): string {
		return 'Panasonic PTZ ' + this.deviceId
	}
	get queue() {
		return this._doOnTime.getQueue()
	}
	private _setConnected(connected: boolean) {
		if (this._connected !== connected) {
			this._connected = connected
			this._connectionChanged()
		}
	}
	private _connectionChanged() {
		this.emit('connectionChanged', this.getStatus())
	}
	private getValue<A extends { value: B }, B>(a?: A): B | undefined {
		if (a) return a.value
		return undefined
	}
}
