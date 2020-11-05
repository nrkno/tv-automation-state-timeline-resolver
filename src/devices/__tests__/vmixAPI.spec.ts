import { VMix } from '../vmixAPI'
import { setupVmixMock } from './vmixMock'
import { VMixOptions } from '../../types/src/vmix'

const orgSetTimeout = setTimeout

function wait(time = 1) {
	return new Promise((resolve) => {
		orgSetTimeout(resolve, time)
	})
}
describe('vMixAPI', () => {
	const { vmixServer, onGet, onPost, onPut, onHead, onPatch, onDel, onDelete } = setupVmixMock()

	beforeEach(() => {
		onGet.mockClear()
		onPost.mockClear()
		onPut.mockClear()
		onHead.mockClear()
		onPatch.mockClear()
		onDel.mockClear()
		onDelete.mockClear()
	})
	test('Connectivity', async () => {
		const onError = jest.fn()
		const onConnected = jest.fn()
		const onDisconnected = jest.fn()
		const onStateChanged = jest.fn()

		const vmix = new VMix()
		vmix.on('error', onError)
		vmix.on('connected', onConnected)
		vmix.on('disconnected', onDisconnected)
		vmix.on('stateChanged', onStateChanged)

		expect(!vmix.connected)

		const options: VMixOptions = {
			host: '127.0.0.1',
			port: 9999,
		}
		await vmix.connect(options)

		await wait(100)

		expect(vmix.connected)

		expect(onGet).toHaveBeenCalledTimes(1)
		expect(onGet).toHaveBeenCalledWith('http://127.0.0.1:9999/api', undefined, expect.any(Function))

		// console.log(vmix.state)
		expect(vmix.state).toEqual({
			version: '21.0.0.55',
			edition: 'HD',
			inputs: {
				'1': {
					number: 1,
					type: 'Capture',
					state: 'Running',
					position: 0,
					duration: 0,
					loop: false,
					muted: false,
					volume: 100,
					balance: 0,
					audioBuses: 'M',
					transform: {
						alpha: -1,
						panX: 0,
						panY: 0,
						zoom: 1,
					},
				},
				'2': {
					number: 2,
					type: 'Capture',
					state: 'Running',
					position: 0,
					duration: 0,
					loop: false,
					muted: true,
					volume: 100,
					balance: 0,
					audioBuses: 'M,C',
					transform: {
						alpha: -1,
						panX: 0,
						panY: 0,
						zoom: 1,
					},
				},
			},
			overlays: [
				{ number: 1, input: undefined },
				{ number: 2, input: undefined },
				{ number: 3, input: undefined },
				{ number: 4, input: undefined },
				{ number: 5, input: undefined },
				{ number: 6, input: undefined },
			],
			mixes: [
				{
					number: 1,
					program: 1,
					preview: 2,
					transition: {
						duration: 0,
						effect: 'Cut',
					},
				},
			],
			fadeToBlack: false,
			recording: true,
			external: true,
			streaming: true,
			playlist: false,
			multiCorder: false,
			fullscreen: false,
			audio: [
				{
					volume: 100,
					muted: false,
					meterF1: 0.04211706,
					meterF2: 0.04211706,
					headphonesVolume: 74.80521,
				},
			],
			fixedInputsCount: 2,
		})

		expect(onConnected).toHaveBeenCalledTimes(1)
		expect(onStateChanged).toHaveBeenCalledTimes(1)
		expect(onDisconnected).toHaveBeenCalledTimes(0)
		expect(onError).toHaveBeenCalledTimes(0)

		await vmix.dispose()

		expect(!vmix.connected)
	})
	test('Connection status', async () => {
		const vmix = new VMix()
		const onError = jest.fn()
		const onConnected = jest.fn()
		const onDisconnected = jest.fn()
		const onStateChanged = jest.fn()
		vmix.on('error', onError)
		vmix.on('connected', onConnected)
		vmix.on('disconnected', onDisconnected)
		vmix.on('stateChanged', onStateChanged)
		vmix.pingInterval = 2000
		const options: VMixOptions = {
			host: '127.0.0.1',
			port: 9999,
		}
		await vmix.connect(options)

		await wait(100)

		expect(vmix.connected).toEqual(true)
		expect(onConnected).toHaveBeenCalledTimes(1)
		onConnected.mockClear()

		vmixServer.serverIsUp = false
		await wait(vmix.pingInterval)

		expect(!vmix.connected)
		expect(onDisconnected).toHaveBeenCalledTimes(1)
		onDisconnected.mockClear()

		vmixServer.serverIsUp = true
		await wait(vmix.pingInterval)

		expect(vmix.connected)
		expect(onConnected).toHaveBeenCalledTimes(1)
		onConnected.mockClear()
		await vmix.dispose()
	})
})
