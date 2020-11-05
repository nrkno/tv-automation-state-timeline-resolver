import { PanasonicPtzHttpInterface } from '../panasonicPTZAPI'
import * as request from '../../__mocks__/request'
import { URL } from 'url'

const orgSetTimeout = setTimeout

interface MockDevice {
	returnError: string | null
	zoom: number
	zoomSpeed: number
	speed: number
	preset: number
	powerMode: 'p1' | 'p0' | 'p3'
}
function mockReply(mockDevice: MockDevice, urlString: string) {
	const url = new URL(urlString)

	const cmd = url.searchParams.get('cmd') || ''
	// console.log('mockReply', cmd)

	if (mockDevice.returnError) return mockDevice.returnError

	const preset = cmd.match(/#R(\d+)/) // #R%02i
	const speed = cmd.match(/#UPVS(\d+)/) // #UPVS%03i
	const zoomSpeed = cmd.match(/#Z(\w+)/) // #Z%02i
	const zoom = cmd.match(/#AXZ(\w+)/) // #AXZ%03X

	if (cmd === '#O') {
		// POWER_MODE_QUERY
		return mockDevice.powerMode
	} else if (preset) {
		// PRESET_NUMBER_CONTROL_TPL
		mockDevice.preset = Number(preset[1])
		return 's' + mockDevice.preset
	} else if (cmd === '#S') {
		// PRESET_NUMBER_QUERY
		return 's' + mockDevice.preset
	} else if (speed) {
		// PRESET_SPEED_CONTROL_TPL
		mockDevice.speed = Number(speed[1])
		return 'uPVS' + mockDevice.speed
	} else if (cmd === '#UPVS') {
		// PRESET_SPEED_QUERY
		return 'uPVS' + mockDevice.speed
	} else if (zoomSpeed) {
		// ZOOM_SPEED_CONTROL_TPL
		mockDevice.zoomSpeed = Number(zoomSpeed[1])
		return 'zS' + mockDevice.zoomSpeed
	} else if (cmd === '#Z') {
		// ZOOM_SPEED_QUERY
		return 'zS' + mockDevice.zoomSpeed
	} else if (zoom) {
		// ZOOM_CONTROL_TPL
		mockDevice.zoom = Number.parseInt(zoom[1], 16)
		return 'axz' + mockDevice.zoom.toString(16)
	} else if (cmd === '#GZ') {
		// ZOOM_QUERY
		return 'gz' + mockDevice.zoom.toString(16)
	} else {
		return 'Mock: Unknown Command ' + cmd
	}
}
describe('PanasonicAPI', () => {
	jest.mock('request', () => request)

	const mockDevice: MockDevice = {
		powerMode: 'p1',
		preset: 0,
		speed: 0,
		zoomSpeed: 0,
		zoom: 0,
		returnError: null,
	}

	// let requestReturnsOK = true
	function handleRequest(urlString, _options, callback) {
		orgSetTimeout(() => {
			callback(null, { body: mockReply(mockDevice, urlString) })
		}, 1)
	}

	const onGet = jest.fn(handleRequest)
	const onPost = jest.fn(handleRequest)
	const onPut = jest.fn(handleRequest)
	const onHead = jest.fn(handleRequest)
	const onPatch = jest.fn(handleRequest)
	const onDel = jest.fn(handleRequest)
	const onDelete = jest.fn(handleRequest)

	request.setMockGet(onGet)
	request.setMockPost(onPost)
	request.setMockPut(onPut)
	request.setMockHead(onHead)
	request.setMockPatch(onPatch)
	request.setMockDel(onDel)
	request.setMockDelete(onDelete)

	beforeEach(() => {
		// jest.useFakeTimers()
		onGet.mockClear()
		onPost.mockClear()
		onPut.mockClear()
		onHead.mockClear()
		onPatch.mockClear()
		onDel.mockClear()
		onDelete.mockClear()
	})
	test('Basic methods', async () => {
		const onError = jest.fn()
		const onDisconnected = jest.fn()

		const panasonicPTZ = new PanasonicPtzHttpInterface('127.0.0.1')
		panasonicPTZ.on('error', onError)
		panasonicPTZ.on('disconnected', onDisconnected)

		mockDevice.powerMode = 'p0' // POWER_MODE_STBY
		expect(await panasonicPTZ.ping()).toEqual(false)

		mockDevice.powerMode = 'p3' // POWER_MODE_TURNING_ON
		expect(await panasonicPTZ.ping()).toEqual('turningOn')

		mockDevice.powerMode = 'p1' // POWER_MODE_ON
		expect(await panasonicPTZ.ping()).toEqual(true)

		expect(await panasonicPTZ.recallPreset(42)).toEqual(42)
		expect(mockDevice.preset).toEqual(42)
		expect(await panasonicPTZ.recallPreset(7)).toEqual(7)
		expect(await panasonicPTZ.setSpeed(0)).toEqual(0)
		expect(await panasonicPTZ.setSpeed(250)).toEqual(250)
		expect(await panasonicPTZ.setZoomSpeed(49 + 50)).toEqual(49 + 50)
		expect(await panasonicPTZ.setZoomSpeed(25 + 50)).toEqual(25 + 50)
		expect(await panasonicPTZ.setZoom(0x555)).toEqual(0x555)
		expect(await panasonicPTZ.setZoom(1 * 0xaaa + 0x555)).toEqual(1 * 0xaaa + 0x555)

		expect(await panasonicPTZ.getPreset()).toEqual(7)
		expect(await panasonicPTZ.getSpeed()).toEqual(250)
		expect(await panasonicPTZ.getZoomSpeed()).toEqual(25 + 50)
		expect(await panasonicPTZ.getZoom()).toEqual(1 * 0xaaa + 0x555)

		// test that queueing works:
		// mockDevice.preset = 0
		// const p0 = panasonicPTZ.recallPreset(42)
		// const p1 = panasonicPTZ.recallPreset(7)
		// console.log('a')

		// expect(mockDevice.preset).toEqual(0)
		// await p0
		// console.log('b')
		// expect(mockDevice.preset).toEqual(42)
		// await p1
		// console.log('c')
		// expect(mockDevice.preset).toEqual(7)

		// return error:
		mockDevice.returnError = 'E1'
		let err: any = null
		try {
			await panasonicPTZ.recallPreset(42)
		} catch (e) {
			err = e
		}
		expect(err).toEqual('Device returned an error: E1')
		mockDevice.returnError = null

		expect(onDisconnected).toHaveBeenCalledTimes(0)
		panasonicPTZ.dispose()

		expect(onError).toHaveBeenCalledTimes(0)
	})
})
