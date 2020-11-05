import { EventEmitter } from 'events'
const setTimeoutOrg = setTimeout
const sockets: Array<Socket> = []
const onNextSocket: Array<(self: Socket) => void> = []

export class Socket extends EventEmitter {
	public onWrite: (buff: Buffer, encoding: string) => void
	public onConnect: (port: number, host: string) => void
	public onClose: () => void

	private _port: number
	private _host: string
	private _connected = false

	constructor() {
		super()

		const cb = onNextSocket.shift()
		if (cb) {
			cb(this)
		}

		sockets.push(this)
	}

	public static mockSockets() {
		return sockets
	}
	public static mockOnNextSocket(cb: (s: Socket) => void) {
		onNextSocket.push(cb)
	}
	// this.emit('connect')
	// this.emit('close')
	// this.emit('end')

	public connect(port, host, cb) {
		this._port = port
		this._host = host

		if (this.onConnect) this.onConnect(port, host)
		setTimeoutOrg(() => {
			cb()
			this.setConnected()
		}, 3)
	}
	public write(buff: Buffer, encoding = 'utf8') {
		if (this.onWrite) {
			this.onWrite(buff, encoding)
		}
	}
	public end() {
		this.setEnd()
		this.setClosed()
	}

	public mockClose() {
		this.setClosed()
	}
	public mockData(data: Buffer) {
		this.emit('data', data)
	}

	private setConnected() {
		if (this._connected !== true) {
			this._connected = true
		}
		this.emit('connect')
	}
	private setClosed() {
		if (this._connected !== false) {
			this._connected = false
		}
		this.emit('close')
		if (this.onClose) this.onClose()
	}
	private setEnd() {
		if (this._connected !== false) {
			this._connected = false
		}
		this.emit('end')
	}
}
