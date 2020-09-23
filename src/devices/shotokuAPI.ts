import { EventEmitter } from 'events'
import { Socket } from 'net'

const TIMEOUT = 10000 // ms
const RETRY_TIMEOUT = 5000 // ms

export class ShotokuAPI extends EventEmitter {
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

	send (command: ShotokuCommand) {
		const codes = {
			[ShotokuCommandType.Fade]: 0x01,
			[ShotokuCommandType.Cut]: 0x02
		}
		let commandCode = codes[command.type]
		const show = command.show || 1

		if (command.changeOperatorScreen) commandCode += 0x20

		const cmd = [0xF9, 0x01, commandCode, 0x00, show, command.shot, 0x00, 0x00]

		cmd.push(0x40 - cmd.reduce((a, b) => a + b)) // add checksum

		return this._sendTCPMessage(Buffer.from(cmd))
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
			this._tcpClient.on('data', (data) => {
				// for debugging purposes, output everything we get back:
				this.emit('debug', data.toString('hex'))
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
					this.emit('error', '_tcpClient error', e)
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
		} else throw Error('_shotokuAPI: _tcpClient is falsy!')
	}
}

export interface ShotokuCommand {
	type: ShotokuCommandType
	show?: number
	shot: number
	changeOperatorScreen?: boolean
}

export enum ShotokuCommandType {
	Cut = 'cut',
	Fade = 'fade'
}
