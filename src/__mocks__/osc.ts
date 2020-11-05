import { EventEmitter } from 'events'

export const MockOSC = {
	connectionIsGood: true,
}
const orgSetTimeout = setTimeout
export class UDPPort extends EventEmitter {
	open() {
		this.emit('ready')
	}

	send({ address }) {
		orgSetTimeout(() => {
			if (MockOSC.connectionIsGood) {
				if (address === '/state/full') {
					this.emit('message', {
						address: '/state/full',
						args: [
							{
								type: 's',
								value: `{ "channel": [{
								"faderLevel": 0.75,
								"pgmOn": false,
								"pstOn": false
							}, {
								"faderLevel": 0.75,
								"pgmOn": false,
								"pstOn": false
							}] }`,
							},
						],
					})
					return
				}
				const m = address.match(/\/ping\/(\d+)/)
				if (m) {
					const pingValue = m[1]
					this.emit('message', {
						address: '/pong',
						args: [
							{
								type: 's',
								value: pingValue,
							},
						],
					})
					return
				}
			}
		}, 1)
	}

	close() {
		//
	}
}
