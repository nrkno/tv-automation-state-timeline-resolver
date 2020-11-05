import { Socket } from 'net'
import _ from 'underscore'
import { DeviceWithState, CommandWithContext, DeviceStatus, StatusCode, IDevice } from './device'
import { DeviceType, TCPSendOptions, TcpSendCommandContent, DeviceOptionsTCPSend, Mappings } from '../types/src'
import { DoOnTime, SendMode } from '../doOnTime'
import { TimelineState, ResolvedTimelineObjectInstance } from 'superfly-timeline'

const TIMEOUT = 3000 // ms
const RETRY_TIMEOUT = 5000 // ms
export interface DeviceOptionsTCPSendInternal extends DeviceOptionsTCPSend {
	options: DeviceOptionsTCPSend['options'] & { commandReceiver?: CommandReceiver }
}
export type CommandReceiver = (
	time: number,
	cmd: TcpSendCommandContent,
	context: CommandContext,
	timelineObjId: string
) => Promise<any>

interface TCPSendCommand {
	commandName: 'added' | 'changed' | 'removed'
	content: TcpSendCommandContent
	context: CommandContext
	timelineObjId: string
}
type CommandContext = string

type TSCSendState = TimelineState

/**
 * This is a TCPSendDevice, it sends commands over tcp when it feels like it
 */
export class TCPSendDevice extends DeviceWithState<TSCSendState> implements IDevice {
	private _makeReadyCommands: TcpSendCommandContent[] = []
	private _makeReadyDoesReset: boolean = false

	private _doOnTime: DoOnTime
	private _tcpClient: Socket | null = null
	private _connected = false
	private _host: string
	private _port: number
	private _bufferEncoding?: BufferEncoding
	private _setDisconnected = false // set to true if disconnect() has been called (then do not trye to reconnect)
	private _retryConnectTimeout: NodeJS.Timer | undefined
	// private _queue: Array<any>

	private _commandReceiver: CommandReceiver

	constructor(deviceId: string, deviceOptions: DeviceOptionsTCPSendInternal, getCurrentTime: () => Promise<number>) {
		super(deviceId, deviceOptions, getCurrentTime)

		if (deviceOptions.options?.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
		else this._commandReceiver = this._defaultCommandReceiver

		this._host = deviceOptions.options.host
		this._port = deviceOptions.options.port

		this._doOnTime = new DoOnTime(
			() => {
				return this.getCurrentTime()
			},
			SendMode.IN_ORDER,
			this._deviceOptions
		)
		this.handleDoOnTime(this._doOnTime, 'TCPSend')
	}
	init(initOptions: TCPSendOptions): Promise<boolean> {
		this._makeReadyCommands = initOptions.makeReadyCommands || []
		this._makeReadyDoesReset = initOptions.makeReadyDoesReset || false

		this._host = initOptions.host
		this._port = initOptions.port
		this._bufferEncoding = initOptions.bufferEncoding

		return this._connectTCPClient().then(() => {
			return true
		})
	}
	/** Called by the Conductor a bit before a .handleState is called */
	prepareForHandleState(newStateTime: number) {
		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(newStateTime)
		this.cleanUpStates(0, newStateTime)
	}
	handleState(newState: TimelineState, newMappings: Mappings) {
		super.onHandleState(newState, newMappings)
		// Handle this new state, at the point in time specified

		const previousStateTime = Math.max(this.getCurrentTime(), newState.time)
		const oldTCPSendState: TSCSendState = (
			this.getStateBefore(previousStateTime) || { state: { time: 0, layers: {}, nextEvents: [] } }
		).state

		const newTCPSendState = this.convertStateToTCPSend(newState)

		const commandsToAchieveState: Array<any> = this._diffStates(oldTCPSendState, newTCPSendState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)
		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newState, newState.time)
	}
	clearFuture(clearAfterTime: number) {
		// Clear any scheduled commands after this time
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}

	async makeReady(okToDestroyStuff?: boolean): Promise<void> {
		if (okToDestroyStuff) {
			await this._disconnectTCPClient()
			await this._connectTCPClient()

			const time = this.getCurrentTime()

			if (this._makeReadyDoesReset) {
				this.clearStates()
				this._doOnTime.clearQueueAfter(0)
			}

			for (const cmd of this._makeReadyCommands || []) {
				await this._commandReceiver(time, cmd, 'makeReady', '')
			}
		}
	}
	async terminate() {
		this._doOnTime.dispose()
		if (this._retryConnectTimeout) clearTimeout(this._retryConnectTimeout)

		await this._disconnectTCPClient()

		return true
	}
	get canConnect(): boolean {
		return true
	}
	get connected(): boolean {
		return this._connected
	}
	convertStateToTCPSend(state: TimelineState) {
		// convert the timeline state into something we can use
		// (won't even use this.mapping)
		return state
	}
	get deviceType() {
		return DeviceType.TCPSEND
	}
	get deviceName(): string {
		return 'TCP-Send ' + this.deviceId
	}
	get queue() {
		return this._doOnTime.getQueue()
	}
	getStatus(): DeviceStatus {
		return {
			statusCode: this._connected ? StatusCode.GOOD : StatusCode.BAD,
			active: this.isActive,
		}
	}
	private _setConnected(connected: boolean) {
		if (this._connected !== connected) {
			this._connected = connected
			this._connectionChanged()

			if (!connected) {
				this._triggerRetryConnection()
			}
		}
	}
	private _triggerRetryConnection() {
		if (!this._retryConnectTimeout) {
			this._retryConnectTimeout = setTimeout(() => {
				this._retryConnection()
			}, RETRY_TIMEOUT)
		}
	}
	private _retryConnection() {
		if (this._retryConnectTimeout) clearTimeout(this._retryConnectTimeout)

		if (!this.connected && !this._setDisconnected) {
			this._connectTCPClient().catch((err) => {
				this.emit('error', 'reconnect TCP', err)
			})
		}
	}
	/**
	 * Add commands to queue, to be executed at the right time
	 */
	private _addToQueue(commandsToAchieveState: Array<TCPSendCommand>, time: number) {
		_.each(commandsToAchieveState, (cmd: TCPSendCommand) => {
			// add the new commands to the queue:
			this._doOnTime.queue(
				time,
				undefined,
				(cmd: TCPSendCommand) => {
					if (cmd.commandName === 'added' || cmd.commandName === 'changed') {
						return this._commandReceiver(time, cmd.content, cmd.context, cmd.timelineObjId)
					} else {
						return null
					}
				},
				cmd
			)
		})
	}
	/**
	 * Compares the new timeline-state with the old one, and generates commands to account for the difference
	 */
	private _diffStates(oldTCPSendState: TimelineState, newTCPSendState: TimelineState): Array<TCPSendCommand> {
		// in this TCPSend class, let's just cheat:
		const commands: Array<TCPSendCommand> = []

		_.each(newTCPSendState.layers, (newLayer: ResolvedTimelineObjectInstance, layerKey: string) => {
			const oldLayer = oldTCPSendState.layers[layerKey]
			// added/changed
			if (newLayer.content) {
				if (!oldLayer) {
					// added!
					commands.push({
						commandName: 'added',
						content: newLayer.content as TcpSendCommandContent,
						context: `added: ${newLayer.id}`,
						timelineObjId: newLayer.id,
					})
				} else {
					// changed?
					if (!_.isEqual(oldLayer.content, newLayer.content)) {
						// changed!
						commands.push({
							commandName: 'changed',
							content: newLayer.content as TcpSendCommandContent,
							context: `changed: ${newLayer.id}`,
							timelineObjId: newLayer.id,
						})
					}
				}
			}
		})
		// removed
		_.each(oldTCPSendState.layers, (oldLayer: ResolvedTimelineObjectInstance, layerKey) => {
			const newLayer = newTCPSendState.layers[layerKey]
			if (!newLayer) {
				// removed!
				commands.push({
					commandName: 'removed',
					content: oldLayer.content as TcpSendCommandContent,
					context: `removed: ${oldLayer.id}`,
					timelineObjId: oldLayer.id,
				})
			}
		})
		return commands.sort((a, b) => {
			return (a.content.temporalPriority || 0) - (b.content.temporalPriority || 0)
		})
	}
	private _disconnectTCPClient(): Promise<void> {
		return new Promise((resolve) => {
			this._setDisconnected = true
			if (this._tcpClient) {
				if (this.connected) {
					this._tcpClient.once('close', () => {
						resolve()
					})
					this._tcpClient.once('end', () => {
						resolve()
					})
					this._tcpClient.end()

					setTimeout(() => {
						resolve()
					}, TIMEOUT)
					setTimeout(() => {
						if (this._tcpClient && this.connected) {
							// Forcefully destroy the connection:
							this._tcpClient.destroy()
						}
					}, Math.floor(TIMEOUT / 2))
				} else {
					resolve()
				}
			} else {
				resolve()
			}
		}).then(() => {
			if (this._tcpClient) {
				this._tcpClient.removeAllListeners('connect')
				this._tcpClient.removeAllListeners('close')
				this._tcpClient.removeAllListeners('end')
				this._tcpClient.removeAllListeners('error')

				this._tcpClient = null
			}
			this._setConnected(false)
		})
	}
	private _connectTCPClient(): Promise<void> {
		this._setDisconnected = false

		if (!this._tcpClient) {
			this._tcpClient = new Socket()
			this._tcpClient.on('connect', () => {
				this._setConnected(true)
			})
			this._tcpClient.on('close', () => {
				this._setConnected(false)
			})
			this._tcpClient.on('end', () => {
				this._setConnected(false)
			})
		}
		if (!this.connected) {
			return new Promise((resolve, reject) => {
				this._tcpClient!.connect(this._port, this._host, () => {
					resolve()
					// client.write('Hello, server! Love, Client.');
				})
				setTimeout(() => {
					reject(`TCP timeout: Unable to connect to ${this._host}:${this._port}`)
				}, TIMEOUT)
			})
		} else {
			return Promise.resolve()
		}
	}
	private _sendTCPMessage(message: string): Promise<void> {
		// Do we have a client?
		return this._connectTCPClient().then(() => {
			if (this._tcpClient) {
				this._tcpClient.write(Buffer.from(message, this._bufferEncoding))
			} else throw Error('_sendTCPMessage: _tcpClient is falsy!')
		})
	}
	private _defaultCommandReceiver(
		_time: number,
		cmd: TcpSendCommandContent,
		context: CommandContext,
		timelineObjId: string
	): Promise<any> {
		// this.emit('info', 'TCTSend ', cmd)

		const cwc: CommandWithContext = {
			context: context,
			command: cmd,
			timelineObjId: timelineObjId,
		}
		this.emit('debug', cwc)

		if (cmd.message) {
			return this._sendTCPMessage(cmd.message)
		} else {
			return Promise.reject('tcpCommand.message not set')
		}
	}
	private _connectionChanged() {
		this.emit('connectionChanged', this.getStatus())
	}
}
