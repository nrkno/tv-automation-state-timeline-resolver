import _ from 'underscore'
// import * as underScoreDeepExtend from 'underscore-deep-extend'
import { TimelineState } from 'superfly-timeline'
import { DeviceWithState, CommandWithContext, DeviceStatus, StatusCode, IDevice } from './device'
import {
	DeviceType,
	TimelineContentTypeHyperdeck,
	MappingHyperdeck,
	MappingHyperdeckType,
	HyperdeckOptions,
	TimelineObjHyperdeckTransport,
	TimelineObjHyperdeckAny,
	DeviceOptionsHyperdeck,
	Mappings,
} from '../types/src'
import {
	Hyperdeck,
	Commands as HyperdeckCommands,
	TransportStatus,
	FilesystemFormat,
	SlotStatus,
} from 'hyperdeck-connection'
import { DoOnTime, SendMode } from '../doOnTime'
import { SlotInfoCommandResponse } from 'hyperdeck-connection/dist/commands'

export interface DeviceOptionsHyperdeckInternal extends DeviceOptionsHyperdeck {
	options: DeviceOptionsHyperdeck['options'] & { commandReceiver?: CommandReceiver }
}
export type CommandReceiver = (
	time: number,
	command: HyperdeckCommands.AbstractCommand,
	context: CommandContext,
	timelineObjId: string
) => Promise<any>
export interface HyperdeckCommandWithContext {
	command: HyperdeckCommands.AbstractCommand
	context: CommandContext
	timelineObjId: string
}

export interface TransportInfoCommandResponseExt {
	status: TransportStatus
	recordFilename?: string
}

export interface DeviceState {
	notify: HyperdeckCommands.NotifyCommandResponse
	transport: TransportInfoCommandResponseExt
	/** The timelineObject this state originates from */
	timelineObjId: string
}

type CommandContext = any
/**
 * This is a wrapper for the Hyperdeck Device. Commands to any and all hyperdeck devices will be sent through here.
 */
export class HyperdeckDevice extends DeviceWithState<DeviceState> implements IDevice {
	private _doOnTime: DoOnTime

	private _hyperdeck: Hyperdeck
	private _initialized = false
	private _connected = false

	private _recordingTime: number
	private _minRecordingTime: number // 15 minutes
	private _recTimePollTimer: NodeJS.Timer
	private _slots = 0
	private _slotStatus = {}
	private _transportStatus: TransportStatus

	private _commandReceiver: CommandReceiver

	constructor(
		deviceId: string,
		deviceOptions: DeviceOptionsHyperdeckInternal,
		getCurrentTime: () => Promise<number>
	) {
		super(deviceId, deviceOptions, getCurrentTime)

		if (deviceOptions.options.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
		else this._commandReceiver = this._defaultCommandReceiver

		this._doOnTime = new DoOnTime(
			() => {
				return this.getCurrentTime()
			},
			SendMode.BURST,
			this._deviceOptions
		)
		this.handleDoOnTime(this._doOnTime, 'Hyperdeck')
	}

	/**
	 * Initiates the connection with the Hyperdeck through the hyperdeck-connection lib.
	 */
	init(initOptions: HyperdeckOptions): Promise<boolean> {
		return new Promise((resolve /*, reject*/) => {
			let firstConnect = true

			this._hyperdeck = new Hyperdeck({ pingPeriod: 1000 })
			this._hyperdeck.connect(initOptions.host, initOptions.port)
			this._hyperdeck.on('connected', async () => {
				await this._hyperdeck.sendCommand(new HyperdeckCommands.RemoteCommand(true))

				this._queryCurrentState()
					.then(async (state) => {
						this.setState(state, this.getCurrentTime())
						if (firstConnect) {
							firstConnect = false
							this._initialized = true
							this._slots = await this._querySlotNumber()
							resolve(true)
						}
						this._connected = true
						this._connectionChanged()
						this.emit('resetResolver')
					})
					.catch((e) => this.emit('error', 'Hyperdeck.on("connected")', e))

				if (initOptions.minRecordingTime) {
					this._minRecordingTime = initOptions.minRecordingTime
					if (this._recTimePollTimer) clearTimeout(this._recTimePollTimer)
				}
				this._queryRecordingTime().catch((e) => this.emit('error', 'HyperDeck.queryRecordingTime', e))

				const notifyCmd = new HyperdeckCommands.NotifySetCommand()
				notifyCmd.slot = true
				notifyCmd.transport = true
				this._hyperdeck.sendCommand(notifyCmd).catch((e) => this.emit('error', 'HyperDeck.on("connected")', e))

				const tsCmd = new HyperdeckCommands.TransportInfoCommand()
				this._hyperdeck
					.sendCommand(tsCmd)
					.then((r) => (this._transportStatus = r.status))
					.catch((e) => this.emit('error', 'HyperDeck.on("connected")', e))
			})
			this._hyperdeck.on('disconnected', () => {
				this._connected = false
				this._connectionChanged()
			})
			this._hyperdeck.on('error', (e) => this.emit('error', 'Hyperdeck', e))

			this._hyperdeck.on('notify.slot', async (res: SlotInfoCommandResponse) => {
				await this._queryRecordingTime().catch((e) => this.emit('error', 'HyperDeck.queryRecordingTime', e))
				if (res.status) this._connectionChanged()
			})
			this._hyperdeck.on('notify.transport', async (res: TransportInfoCommandResponseExt) => {
				if (res.status) {
					this._transportStatus = res.status

					const state = this.getState()
					if (state && state.state.transport.status !== res.status) {
						this._connectionChanged()
					}
				}
			})
		})
	}
	/**
	 * Makes this device ready for garbage collection.
	 */
	async terminate(): Promise<boolean> {
		this._doOnTime.dispose()
		if (this._recTimePollTimer) clearTimeout(this._recTimePollTimer)

		await this._hyperdeck.disconnect()
		this._hyperdeck.removeAllListeners()
		return true
	}

	/**
	 * Prepares device for playout
	 */
	async makeReady(okToDestroyStuff?: boolean): Promise<void> {
		if (okToDestroyStuff) {
			const time = this.getCurrentTime()
			this._doOnTime.clearQueueNowAndAfter(time)

			// TODO - could this being slow/offline be a problem?
			const state = await this._queryCurrentState()

			this.setState(state, time)
		}
	}

	/**
	 * Sends commands to the HyperDeck to format disks. Afterwards,
	 * calls this._queryRecordingTime
	 */
	async formatDisks() {
		const wait = (t) => new Promise((resolve) => setTimeout(() => resolve(), t))

		for (let i = 1; i <= this._slots; i++) {
			// select slot
			const slotSel = new HyperdeckCommands.SlotSelectCommand()
			slotSel.slotId = i + ''
			try {
				await this._hyperdeck.sendCommand(slotSel)
			} catch (e) {
				continue
			}
			// get code:
			const prepare = new HyperdeckCommands.FormatCommand()
			prepare.filesystem = FilesystemFormat.exFAT
			const res = await this._hyperdeck.sendCommand(prepare)

			const format = new HyperdeckCommands.FormatConfirmCommand()
			format.code = res.code
			await this._hyperdeck.sendCommand(format)

			// now actualy await until finished:
			const slotInfo = new HyperdeckCommands.SlotInfoCommand(i)
			while ((await this._hyperdeck.sendCommand(slotInfo)).status === SlotStatus.EMPTY) {
				await wait(500)
			}
		}

		await this._queryRecordingTime()
	}
	/** Called by the Conductor a bit before a .handleState is called */
	prepareForHandleState(newStateTime: number) {
		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(newStateTime)
		this.cleanUpStates(0, newStateTime)
	}
	/**
	 * Saves and handles state at specified point in time such that the device will be in
	 * that state at that time.
	 * @param newState
	 */
	handleState(newState: TimelineState, newMappings: Mappings) {
		super.onHandleState(newState, newMappings)
		if (!this._initialized) {
			// before it's initialized don't do anything
			this.emit('info', 'Hyperdeck not initialized yet')
			return
		}

		// Create device states
		const previousStateTime = Math.max(this.getCurrentTime(), newState.time)
		const oldState: DeviceState = (this.getStateBefore(previousStateTime) || { state: this._getDefaultState() })
			.state

		const oldHyperdeckState = oldState
		const newHyperdeckState = this.convertStateToHyperdeck(newState, newMappings)

		// Generate commands to transition to new state
		const commandsToAchieveState: Array<HyperdeckCommandWithContext> = this._diffStates(
			oldHyperdeckState,
			newHyperdeckState
		)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)
		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newHyperdeckState, newState.time)
	}
	/**
	 * Clears any scheduled commands after this time
	 * @param clearAfterTime
	 */
	clearFuture(clearAfterTime: number) {
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}
	get canConnect(): boolean {
		return true
	}
	get connected(): boolean {
		return this._connected
	}
	/**
	 * Converts a timeline state to a device state.
	 * @param state
	 */
	convertStateToHyperdeck(state: TimelineState, mappings: Mappings): DeviceState {
		if (!this._initialized) throw Error('convertStateToHyperdeck cannot be used before inititialized')

		// Convert the timeline state into something we can use easier:
		const deviceState = this._getDefaultState()

		const sortedLayers = _.map(state.layers, (tlObject, layerName) => ({ layerName, tlObject })).sort((a, b) =>
			a.layerName.localeCompare(b.layerName)
		)
		_.each(sortedLayers, ({ tlObject, layerName }) => {
			const hyperdeckObj = (tlObject as any) as TimelineObjHyperdeckAny

			const mapping = mappings[layerName] as MappingHyperdeck

			if (mapping && mapping.deviceId === this.deviceId) {
				switch (mapping.mappingType) {
					case MappingHyperdeckType.TRANSPORT:
						if (hyperdeckObj.content.type === TimelineContentTypeHyperdeck.TRANSPORT) {
							const hyperdeckObjTransport = (tlObject as any) as TimelineObjHyperdeckTransport
							if (!deviceState.transport) {
								deviceState.transport = {
									status: hyperdeckObjTransport.content.status,
									recordFilename: hyperdeckObjTransport.content.recordFilename,
								}
							}

							deviceState.transport.status = hyperdeckObjTransport.content.status
							deviceState.transport.recordFilename = hyperdeckObjTransport.content.recordFilename
						}
						break
				}
			}
		})
		return deviceState
	}
	get deviceType() {
		return DeviceType.HYPERDECK
	}
	get deviceName(): string {
		return 'Hyperdeck ' + this.deviceId
	}
	get queue() {
		return this._doOnTime.getQueue()
	}
	getStatus(): DeviceStatus {
		let statusCode = StatusCode.GOOD
		const messages: Array<string> = []

		if (!this._connected) {
			statusCode = StatusCode.BAD
			messages.push('Not connected')
		}

		if (this._connected) {
			// check recording time left
			if (this._minRecordingTime && this._recordingTime < this._minRecordingTime) {
				if (this._recordingTime === 0) {
					statusCode = StatusCode.BAD
				} else {
					statusCode = StatusCode.WARNING_MAJOR
				}
				messages.push(
					`Recording time left is less than ${Math.floor(this._recordingTime / 60)} minutes and ${
						this._recordingTime % 60
					} seconds`
				)
			}

			// check for available slots
			let noAvailableSlots = true
			for (let slot = 1; slot <= this._slots; slot++) {
				if (this._slotStatus[slot] && this._slotStatus[slot].status !== SlotStatus.MOUNTED) {
					messages.push(`Slot ${slot} is not mounted`)
					if (statusCode < StatusCode.WARNING_MINOR) statusCode = StatusCode.WARNING_MINOR
				} else {
					noAvailableSlots = false
				}
			}
			if (noAvailableSlots) {
				statusCode = StatusCode.BAD
			}

			// check if transport status is correct
			const state = this.getState()
			if (state) {
				const supposedState = state.state.transport.status
				if (supposedState === TransportStatus.RECORD && this._transportStatus !== supposedState) {
					if (statusCode < StatusCode.WARNING_MAJOR) statusCode = StatusCode.WARNING_MAJOR
					messages.push('Hyperdeck not recording')
				}
			}
		}
		if (!this._initialized) {
			statusCode = StatusCode.BAD
			messages.push(`Hyperdeck device connection not initialized (restart required)`)
		}

		return {
			statusCode,
			messages,
			active: this.isActive,
		}
	}
	/**
	 * Add commands to queue, to be executed at the right time
	 */
	private _addToQueue(commandsToAchieveState: Array<HyperdeckCommandWithContext>, time: number) {
		_.each(commandsToAchieveState, (cmd: HyperdeckCommandWithContext) => {
			// add the new commands to the queue:
			this._doOnTime.queue(
				time,
				undefined,
				(cmd: HyperdeckCommandWithContext) => {
					return this._commandReceiver(time, cmd.command, cmd.context, cmd.timelineObjId)
				},
				cmd
			)
		})
	}

	/**
	 * Compares the new timeline-state with the old one, and generates commands to account for the difference
	 * @param oldHyperdeckState The assumed current state
	 * @param newHyperdeckState The desired state of the device
	 */
	private _diffStates(
		oldHyperdeckState: DeviceState,
		newHyperdeckState: DeviceState
	): Array<HyperdeckCommandWithContext> {
		const commandsToAchieveState: HyperdeckCommandWithContext[] = []

		if (oldHyperdeckState.notify && newHyperdeckState.notify) {
			const notifyCmd = new HyperdeckCommands.NotifySetCommand()
			let hasChange: {
				timelineObjId: string
			} | null = null

			const keys = _.unique(_.keys(oldHyperdeckState.notify).concat(_.keys(newHyperdeckState.notify)))
			for (const k of keys) {
				if (oldHyperdeckState.notify[k] !== newHyperdeckState.notify[k]) {
					notifyCmd[k] = newHyperdeckState.notify[k]
					hasChange = {
						timelineObjId: newHyperdeckState.timelineObjId,
					}
				}
			}

			if (hasChange) {
				commandsToAchieveState.push({
					command: notifyCmd,
					context: {
						oldState: oldHyperdeckState.notify,
						newState: newHyperdeckState.notify,
					},
					timelineObjId: hasChange.timelineObjId,
				})
			}
		} else {
			this.emit(
				'error',
				'Hyperdeck',
				new Error(
					`diffStates missing notify object: ${JSON.stringify(oldHyperdeckState.notify)}, ${JSON.stringify(
						newHyperdeckState.notify
					)}`
				)
			)
		}

		if (oldHyperdeckState.transport && newHyperdeckState.transport) {
			// TODO - sometimes we can loose track of the filename (eg on reconnect).
			// should we split the record when recovering from that? (it might loose some frames)
			const filenameChanged =
				oldHyperdeckState.transport.recordFilename !== undefined &&
				oldHyperdeckState.transport.recordFilename !== newHyperdeckState.transport.recordFilename
			switch (newHyperdeckState.transport.status) {
				case TransportStatus.RECORD:
					if (oldHyperdeckState.transport.status !== newHyperdeckState.transport.status) {
						// Start recording
						commandsToAchieveState.push({
							command: new HyperdeckCommands.RecordCommand(newHyperdeckState.transport.recordFilename),
							context: {
								oldState: oldHyperdeckState.transport,
								newState: newHyperdeckState.transport,
							},
							timelineObjId: newHyperdeckState.timelineObjId,
						})
					} else if (filenameChanged) {
						// Split recording
						commandsToAchieveState.push({
							command: new HyperdeckCommands.StopCommand(),
							context: {
								oldState: oldHyperdeckState.transport,
								newState: newHyperdeckState.transport,
							},
							timelineObjId: newHyperdeckState.timelineObjId,
						})
						commandsToAchieveState.push({
							command: new HyperdeckCommands.RecordCommand(newHyperdeckState.transport.recordFilename),
							context: {
								oldState: oldHyperdeckState.transport,
								newState: newHyperdeckState.transport,
							},
							timelineObjId: newHyperdeckState.timelineObjId,
						})
					} // else continue recording

					break
				default:
					// TODO - warn
					// for now we are assuming they want a stop. that could be conditional later on
					if (oldHyperdeckState.transport.status === TransportStatus.RECORD) {
						commandsToAchieveState.push({
							command: new HyperdeckCommands.StopCommand(),
							context: {
								oldState: oldHyperdeckState.transport,
								newState: newHyperdeckState.transport,
							},
							timelineObjId: newHyperdeckState.timelineObjId,
						})
					}
					break
			}
		} else {
			this.emit(
				'error',
				'Hyperdeck',
				new Error(
					`diffStates missing transport object: ${JSON.stringify(
						oldHyperdeckState.transport
					)}, ${JSON.stringify(newHyperdeckState.transport)}`
				)
			)
		}

		return commandsToAchieveState
	}

	/**
	 * Gets the current state of the device
	 */
	private async _queryCurrentState(): Promise<DeviceState> {
		if (!this._connected) return this._getDefaultState()

		const notify = this._hyperdeck.sendCommand(new HyperdeckCommands.NotifyGetCommand())
		const transport = this._hyperdeck.sendCommand(new HyperdeckCommands.TransportInfoCommand())

		const notifyRes = await notify
		const transportRes = await transport

		const res: DeviceState = {
			notify: notifyRes,
			transport: transportRes,
			timelineObjId: 'currentState',
		}
		return res
	}

	/**
	 * Queries the recording time left in seconds of the device and mutates
	 * this._recordingTime
	 */
	private async _queryRecordingTime(): Promise<void> {
		if (this._recTimePollTimer) {
			clearTimeout(this._recTimePollTimer)
		}
		let time = 0

		for (let slot = 1; slot <= this._slots; slot++) {
			try {
				const res: SlotInfoCommandResponse = await this._hyperdeck.sendCommand(
					new HyperdeckCommands.SlotInfoCommand(slot)
				)
				this._slotStatus[slot] = res
				if (res.status === 'mounted') {
					time += res.recordingTime
				}
			} catch (e) {
				// null
			}
		}

		if (time !== this._recordingTime) {
			this._recordingTime = time
			this._connectionChanged()
		}

		let timeTillNextUpdate = 10
		if (time > 10) {
			if (time - this._minRecordingTime > 10) {
				timeTillNextUpdate = (time - this._minRecordingTime) / 2
			} else if (time - this._minRecordingTime < 0) {
				timeTillNextUpdate = time / 2
			}
		}
		this._recTimePollTimer = setTimeout(() => {
			this._queryRecordingTime().catch((e) => this.emit('error', 'HyperDeck.queryRecordingTime', e))
		}, timeTillNextUpdate * 1000)
	}

	private async _querySlotNumber(): Promise<number> {
		const { slots } = await this._hyperdeck.sendCommand(new HyperdeckCommands.DeviceInfoCommand())

		// before protocol version 1.9 we do not get slot info, so we assume 2 slots.
		if (!slots) return 2

		return slots
	}

	/**
	 * Gets the default state of the device
	 */
	private _getDefaultState(): DeviceState {
		const res: DeviceState = {
			notify: {
				// TODO - this notify block will want configuring per device or will the state lib always want it the same?
				remote: false,
				transport: false,
				slot: false,
				configuration: false,
				droppedFrames: false,
			},
			transport: {
				status: TransportStatus.PREVIEW,
			},
			timelineObjId: '',
		}

		return res
	}

	private _defaultCommandReceiver(
		_time: number,
		command: HyperdeckCommands.AbstractCommand,
		context: CommandContext,
		timelineObjId: string
	): Promise<any> {
		const cwc: CommandWithContext = {
			context: context,
			timelineObjId: timelineObjId,
			command: command,
		}
		this.emit('debug', cwc)

		return this._hyperdeck.sendCommand(command).catch((error) => {
			this.emit('commandError', error, cwc)
		})
	}
	private _connectionChanged() {
		this.emit('connectionChanged', this.getStatus())
	}
}
