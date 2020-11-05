import { EventEmitter } from 'events'

import { TransportStatus, Commands } from '../../node_modules/hyperdeck-connection'

const setTimeoutOrg = setTimeout

export interface HyperdeckOptions {
	pingPeriod?: number // set to 0 to disable
	debug?: boolean
}

export { TransportStatus, Commands }

const hyperdeckmockInstances: Array<Hyperdeck> = []

export class Hyperdeck extends EventEmitter {
	DEFAULT_PORT = 9993
	RECONNECT_INTERVAL = 5000
	DEBUG = false

	private _connected = false

	private _connectionActive = false
	private _host: string
	private _port: number

	private _mockCommandReceiver?: (cmd: Commands.AbstractCommand) => Promise<any>

	constructor(_options?: HyperdeckOptions) {
		super()
		hyperdeckmockInstances.push(this)
	}

	public static getMockInstances() {
		return hyperdeckmockInstances
	}

	connect(address: string, port?: number) {
		if (this._connected) return
		if (this._connectionActive) return
		this._connectionActive = true

		this._host = address
		this._port = port || this.DEFAULT_PORT

		setTimeoutOrg(() => {
			this.emit('connected')
		}, 1)
	}

	disconnect(): Promise<void> {
		this._connectionActive = false

		if (!this._connected) return Promise.resolve()

		return new Promise((resolve, reject) => {
			try {
				return resolve()
			} catch (e) {
				return reject(e)
			}
		})
	}

	sendCommand(command: Commands.AbstractCommand): Promise<any> {
		if (this._mockCommandReceiver) {
			return this._mockCommandReceiver(command)
		}
		if (
			(command instanceof Commands.SlotSelectCommand || command instanceof Commands.SlotInfoCommand) &&
			(command.slotId || 0) > 2
		) {
			return Promise.reject()
		} else if (command instanceof Commands.DeviceInfoCommand) {
			const res: Commands.DeviceInfoCommandResponse = {
				protocolVersion: 1.9,
				model: 'Mock HyperDeck for TSR',
				slots: '2',
			}
			return Promise.resolve(res)
		} else if (command instanceof Commands.TransportInfoCommand) {
			const res = {
				status: TransportStatus.PREVIEW,
			}
			return Promise.resolve(res)
		}
		return Promise.resolve()
	}

	public setMockCommandReceiver(fcn: (cmd: Commands.AbstractCommand) => Promise<any>) {
		this._mockCommandReceiver = fcn
	}
	get connected() {
		return this._connected
	}
	get host() {
		return this._host
	}
	get port() {
		return this._port
	}
}
