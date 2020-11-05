// mock CasparCG
import {
	AMCP as orgAMCP,
	AMCPUtil as orgAMCPUtil,
	Command as orgCommand,
	CasparCGSocketStatusEvent as orgCasparCGSocketStatusEvent,
} from '../../node_modules/casparcg-connection'
import { EventEmitter } from 'events'

const mockDo = jest.fn()

const instances: Array<CasparCG> = []

export const AMCP = orgAMCP
export const AMCPUtil = orgAMCPUtil
export const Command = orgCommand
export const CasparCGSocketStatusEvent = orgCasparCGSocketStatusEvent

export class CasparCG extends EventEmitter {
	onConnected: () => void

	constructor() {
		super()

		setTimeout(() => {
			// simulate that we're connected
			if (this.onConnected) this.onConnected()
			this.emit(CasparCGSocketStatusEvent.CONNECTED, true)
		}, 10)

		instances.push(this)
	}

	do(cmd) {
		mockDo.apply(this, cmd)
		return Promise.resolve(cmd)
	}

	info() {
		return new Promise((resolve) => {
			const cmd = new AMCP.InfoCommand()
			cmd.response = new Command.AMCPResponse()
			cmd.response.code = 200
			cmd.response.raw = '200 INFO OK\n1 PAL PLAYING\n2 PAL PLAYING\n3 PAL PLAYING'
			cmd.response.data = [
				{
					channel: 1,
					format: 'pal',
					channelRate: 50,
					frameRate: 25,
					interlaced: true,
				},
				{
					channel: 2,
					format: 'pal',
					channelRate: 50,
					frameRate: 25,
					interlaced: true,
				},
				{
					channel: 3,
					format: 'pal',
					channelRate: 50,
					frameRate: 25,
					interlaced: true,
				},
			]
			resolve(cmd)
		})
	}
	clear(channel) {
		return this.do(new AMCP.ClearCommand({ channel }))
	}

	time(channel: number) {
		return new Promise((resolve) => {
			const cmd = new AMCP.TimeCommand({ channel })
			cmd.response = new Command.AMCPResponse()
			cmd.response.code = 201
			cmd.response.raw = '201 INFO OK\n00:00:00:00'
			cmd.response.data = '00:00:00:00'
			resolve(cmd)
		})
	}

	static get mockDo() {
		return mockDo
	}
	static get instances() {
		return instances
	}
}
