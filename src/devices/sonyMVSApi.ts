import { EventEmitter } from 'events'
import { Socket } from 'net'
import { SonyMVSTransitionType } from '../types/src'

const TIMEOUT = 3000 // ms
const RETRY_TIMEOUT = 5000 // ms

export class SonyMVSAPI extends EventEmitter {
	private _tcpClient: Socket | null = null
	private _connected: boolean = false
	private _host: string
	private _port: number
	private _setDisconnected: boolean = false // set to true if disconnect() has been called (then do not trye to reconnect)
	private _retryConnectTimeout: NodeJS.Timer | undefined

	/**
	 * Connnects to the OSC server.
	 * @param host ip to connect to
	 * @param port port the osc server is hosted on
	 */
	async connect (host: string, port: number): Promise<void> {
		this._host = host
		this._port = port

		return this._connectTCPClient()
	}
	async dispose () {
		return this._disconnectTCPClient()
	}

	get connected (): boolean {
		return this._connected
	}

	send (command: SonyMVSCommand) {
		console.log(command)
		const serializer = cmdSerializers[command.commandType]
		if (!serializer) return Promise.resolve() // maybe reject?
		const encoded = serializer(command)

		return this._sendTCPMessage(encoded)
	}

	private _setConnected (connected: boolean) {
		if (this._connected !== connected) {

			this._connected = connected

			if (!connected) {
				this.emit('disconnected')
				this._triggerRetryConnection()
			} else {
				this.emit('connected')
			}
		}
	}
	private _triggerRetryConnection () {
		if (!this._retryConnectTimeout) {
			this._retryConnectTimeout = setTimeout(() => {
				this._retryConnection()
			}, RETRY_TIMEOUT)
		}
	}
	private _retryConnection () {
		if (this._retryConnectTimeout) {
			clearTimeout(this._retryConnectTimeout)
			this._retryConnectTimeout = undefined
		}

		if (!this.connected && !this._setDisconnected) {
			this._connectTCPClient()
			.catch((err) => {
				this.emit('error', 'reconnect TCP', err)
			})
		}
	}

	private _disconnectTCPClient (): Promise<void> {
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
		})
		.then(() => {
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
	private _connectTCPClient (): Promise<void> {
		this._setDisconnected = false

		if (!this._tcpClient) {
			this._tcpClient = new Socket()
			this._tcpClient.on('connect', () => {
				this._setConnected(true)
			})
			this._tcpClient.on('close', () => {
				this._setConnected(false)
				delete this._tcpClient
			})
			this._tcpClient.on('end', () => {
				this._setConnected(false)
				delete this._tcpClient
			})
			this._tcpClient.on('error', (e) => {
				if (e.message.match(/econn/i)) {
					// disconnection
					this._setConnected(false)
				} else {
					this.emit('error', e)
				}
			})
		}
		if (!this.connected) {
			return new Promise((resolve, reject) => {
				let resolved = false
				this._tcpClient!.connect(this._port, this._host, () => {
					resolve()
					resolved = true
					// client.write('Hello, server! Love, Client.');
				})
				setTimeout(() => {
					reject(`TCP timeout: Unable to connect to ${this._host}:${this._port}`)
					this._triggerRetryConnection()
					if (!resolved && this._tcpClient) {
						this._tcpClient.destroy()
						delete this._tcpClient
					}
				}, TIMEOUT)
			})
		} else {
			return Promise.resolve()
		}
	}
	private async _sendTCPMessage (message: Buffer): Promise<void> {
		// Do we have a client?
		if (this._tcpClient) {
			this._tcpClient.write(message)
		} else throw Error('_sonyMVSAPI: _tcpClient is falsy!')
	}
}

export interface SonyMVSMEXPTCommand {
	commandType: SonyMVSCommandType.ME_XPT
	mixEffect: number // 0 - 5
	target: METarget
	input: number
}
export interface SonyMVSAuxXPTCommand {
	commandType: SonyMVSCommandType.AUX_XPT
	aux: number
	input: number
}
export interface SonyMVSTransitionModeCommand {
	commandType: SonyMVSCommandType.NEXT_TRANSITION_MODE
	mixEffect: number // 0 - 5
	mode: SonyMVSTransitionMode
}
export interface SonyMVSTransitionTypeCommand {
	commandType: SonyMVSCommandType.TRANSITION_TYPE
	mixEffect: number // 0 - 5
	type: SonyMVSTransitionType
}
export interface SonyMVSAutoTransitionCommand {
	commandType: SonyMVSCommandType.AUTO_TRANSITION
	mixEffect: number, // 0 - 5
	rate: number
}
export interface SonyMVSKeyToggleCommand {
	commandType: SonyMVSCommandType.AUTO_TRANSITION
	mixEffect: number, // 0 - 5
	key: number, // 1 - 8,
	onAir: boolean
}
export type SonyMVSCommand = SonyMVSMEXPTCommand |
	SonyMVSAuxXPTCommand |
	SonyMVSTransitionModeCommand |
	SonyMVSTransitionTypeCommand |
	SonyMVSAutoTransitionCommand |
	SonyMVSKeyToggleCommand

export enum SonyMVSCommandType {
	ME_XPT = 'ME_XPT',
	AUX_XPT = 'AUX_XPT',
	NEXT_TRANSITION_MODE = 'NEXT_TRANSITION_MODE',
	TRANSITION_TYPE = 'TRANSITION_TYPE',
	AUTO_TRANSITION = 'AUTO_TRANSITION',
	KEY_STATUS = 'KEY_STATUS'
}
export enum METarget {
	BkgdA,
	BkgdB,
	Key1F,
	Key1S,
	Key2F,
	Key2S,
	Key3F,
	Key3S,
	Key4F,
	Key4S,
	Key5F,
	Key5S,
	Key6F,
	Key6S,
	Key7F,
	Key7S,
	Key8F,
	Key8S,
	// TODO - there's some more of these. not important for prototyping
}
export enum SonyMVSTransitionMode {
	KeyPriority,
	Background,
	Key8,
	Key7,
	Key6,
	Key5,
	Key4,
	Key3,
	Key2,
	Key1
}

function encodeInputSourceNumber (input: number, tallyHigh?: boolean) {
	let output = input << 7
	if (tallyHigh) output++

	return output
}
const cmdSerializers: { [key: string]: (command: SonyMVSCommand) => Buffer } = {
	[SonyMVSCommandType.ME_XPT]: function (command: SonyMVSMEXPTCommand): Buffer {
		const targets = {
			[METarget.BkgdA]: 0xc0,
			[METarget.BkgdB]: 0xc1,
			[METarget.Key1F]: 0xc7,
			[METarget.Key1S]: 0xc8,
			[METarget.Key2F]: 0xcd,
			[METarget.Key2S]: 0xce,
			[METarget.Key3F]: 0xc9,
			[METarget.Key3S]: 0xca,
			[METarget.Key4F]: 0xcb,
			[METarget.Key4S]: 0xcc,
			[METarget.Key5F]: 0xd0,
			[METarget.Key5S]: 0xd1,
			[METarget.Key6F]: 0xd6,
			[METarget.Key6S]: 0xd7,
			[METarget.Key7F]: 0xd2,
			[METarget.Key7S]: 0xd3,
			[METarget.Key8F]: 0xd4,
			[METarget.Key8S]: 0xd5,
		}
		const effectAddress = command.mixEffect
		const commandCode = targets[command.target]

		const buffer = Buffer.from([ 0x04, effectAddress, commandCode, 0x00, 0x00 ])
		buffer.writeUInt16LE(encodeInputSourceNumber(command.input), 3)

		return buffer
	},
	// [SonyMVSCommandType.AUX_XPT]: function (command: SonyMVSAuxXPTCommand): Buffer {
	// 	return Buffer.from([])
	// },
	// [SonyMVSCommandType.NEXT_TRANSITION_MODE]: function (command: SonyMVSTransitionModeCommand): Buffer {
	// 	return Buffer.from([])
	// },
	// [SonyMVSCommandType.TRANSITION_TYPE]: function (command: SonyMVSTransitionTypeCommand): Buffer {
	// 	return Buffer.from([])
	// },
	// [SonyMVSCommandType.AUTO_TRANSITION]: function (command: SonyMVSAutoTransitionCommand): Buffer {
	// 	return Buffer.from([])
	// },
	// [SonyMVSCommandType.KEY_STATUS]: function (command: SonyMVSKeyToggleCommand): Buffer {
	// 	return Buffer.from([])
	// },
}
