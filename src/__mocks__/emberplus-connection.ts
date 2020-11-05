// mock emberplus-connection
import { EventEmitter } from 'events'

export { Model, Types } from 'emberplus-connection'

const mockDo = jest.fn()

const instances: Array<EmberClient> = []

export class EmberClient extends EventEmitter {
	tree = {}
	onConnected: () => void

	constructor() {
		super()

		setTimeout(() => {
			// simulate that we're connected
			this.emit('connected')
		}, 10)

		instances.push(this)
	}

	async connect() {
		this.emit('connected')
	}
	async disconnect() {
		this.emit('disconnected')
	}
	discard() {
		// empty block
	}

	async getDirectory() {
		return { response: Promise.resolve() }
	}
	async expand() {
		return {
			result: Promise.resolve(),
		}
	}
	async getElementByPath(p) {
		return {
			path: p,
			contents: {
				parameterType: 'PARAMETER',
				value: 0,
			},
		}
	}
	async setValue() {
		return {
			sentOk: true,
			response: Promise.resolve(),
		}
	}

	static get mockDo() {
		return mockDo
	}
	static get instances() {
		return instances
	}
}
