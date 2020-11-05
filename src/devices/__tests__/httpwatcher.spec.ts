import { Conductor } from '../../conductor'
import { Mappings, DeviceType, MappingHTTPWatcher } from '../../types/src'
import { MockTime } from '../../__tests__/mockTime'
import { StatusCode } from '../device'

import * as request from '../../__mocks__/request'

const myLayerMapping0: MappingHTTPWatcher = {
	device: DeviceType.HTTPWATCHER,
	deviceId: 'myHTTPWatch',
}
const myLayerMapping: Mappings = {
	myLayer0: myLayerMapping0,
}

describe('HTTP-Watcher', () => {
	jest.mock('request', () => request)

	const mockTime = new MockTime()

	let onGet: jest.Mock<void, any[]>
	let mockStatusCode: number
	let mockBody: string
	let myConductor: Conductor = new Conductor({
		initializeAsClear: true,
		getCurrentTime: mockTime.getCurrentTime,
	})
	beforeAll(() => {
		Date.now = jest.fn(() => {
			return mockTime.getCurrentTime()
		})
		onGet = jest.fn((url, _options, callback) => {
			if (url === 'http://localhost') {
				callback(
					null,
					{
						statusCode: mockStatusCode,
						body: mockBody,
					},
					mockBody
				)
			} else {
				callback(new Error('Unsupported mock url: ' + url), null)
			}
		})
		request.setMockGet(onGet)
	})
	beforeEach(() => {
		mockTime.init()
		onGet.mockClear()
		mockStatusCode = 200
		mockBody = 'this is my keyword and its really nice'
		request.setMockGet(onGet)
		myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
	})

	afterEach(() => {
		jest.clearAllTimers()
	})

	test('Good reply, turns bad, then good again', async () => {
		const onError = jest.fn()
		myConductor.on('error', onError)

		const onGetLocal = jest.fn((url, _options, callback) => {
			if (url === 'http://localhost:1234') {
				callback(
					null,
					{
						statusCode: mockStatusCode,
						body: mockBody,
					},
					mockBody
				)
			} else {
				callback(new Error('Unsupported mock'), null)
			}
		})
		request.setMockGet(onGetLocal)

		await myConductor.init()
		const generatedDeviceContainer = await myConductor.addDevice('myHTTPWatch', {
			type: DeviceType.HTTPWATCHER,
			options: {
				uri: 'http://localhost:1234',
				httpMethod: 'get',
				expectedHttpResponse: 200,
				keyword: 'my keyword',
				interval: 10 * 1000,
			},
		})
		const generatedDevice = generatedDeviceContainer.device

		expect(generatedDevice).toBeTruthy()
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN, active: true })

		myConductor.setTimelineAndMappings([], myLayerMapping)

		await mockTime.advanceTimeTicks(10100)
		expect(onGet).toBeCalledTimes(0)
		expect(onGetLocal).toBeCalledTimes(1)
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, active: true })

		mockStatusCode = 500
		await mockTime.advanceTimeTicks(10100)
		expect(await generatedDevice.getStatus()).toMatchObject({
			statusCode: StatusCode.BAD,
			messages: [/status code/i],
			active: true,
		})

		mockStatusCode = 200
		await mockTime.advanceTimeTicks(10100)
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, active: true })

		mockBody = 'sorry not sorry'
		await mockTime.advanceTimeTicks(10100)
		expect(await generatedDevice.getStatus()).toMatchObject({
			statusCode: StatusCode.BAD,
			messages: [/keyword/i],
			active: true,
		})

		mockBody = 'heres my keyword again'
		await mockTime.advanceTimeTicks(10100)
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, active: true })

		await generatedDevice.terminate()
		jest.clearAllTimers()
		expect(onError).toHaveBeenCalledTimes(0)
	})
	test('Only check keyword', async () => {
		const onError = jest.fn()
		myConductor.on('error', onError)

		await myConductor.init()
		const generatedDeviceContainer = await myConductor.addDevice('myHTTPWatch', {
			type: DeviceType.HTTPWATCHER,
			options: {
				uri: 'http://localhost',
				httpMethod: 'get',
				// expectedHttpResponse: 200,
				keyword: 'my keyword',
				interval: 10 * 1000,
			},
		})
		const generatedDevice = generatedDeviceContainer.device

		expect(generatedDevice).toBeTruthy()
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN, active: true })

		myConductor.setTimelineAndMappings([], myLayerMapping)

		await mockTime.advanceTimeTicks(10100)
		expect(onGet).toBeCalledTimes(1)
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, active: true })

		mockStatusCode = 500 // should not matter
		await mockTime.advanceTimeTicks(10100)
		expect(onGet).toBeCalledTimes(2)
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, active: true })

		mockStatusCode = 200
		await mockTime.advanceTimeTicks(10100)
		expect(onGet).toBeCalledTimes(3)
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, active: true })

		mockBody = 'sorry not sorry'
		await mockTime.advanceTimeTicks(10100)
		expect(onGet).toBeCalledTimes(4)
		expect(await generatedDevice.getStatus()).toMatchObject({
			statusCode: StatusCode.BAD,
			messages: [/keyword/i],
			active: true,
		})

		mockBody = 'heres my keyword again'
		await mockTime.advanceTimeTicks(10100)
		expect(onGet).toBeCalledTimes(5)
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, active: true })

		await generatedDevice.terminate()
		jest.clearAllTimers()
		expect(onError).toHaveBeenCalledTimes(0)
	})
	test('Only check response code', async () => {
		const onError = jest.fn()
		myConductor.on('error', onError)

		await myConductor.init()
		const generatedDeviceContainer = await myConductor.addDevice('myHTTPWatch', {
			type: DeviceType.HTTPWATCHER,
			options: {
				uri: 'http://localhost',
				httpMethod: 'get',
				expectedHttpResponse: 200,
				// keyword: 'my keyword',
				interval: 10 * 1000,
			},
		})
		const generatedDevice = generatedDeviceContainer.device

		expect(generatedDevice).toBeTruthy()
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN, active: true })

		myConductor.setTimelineAndMappings([], myLayerMapping)

		await mockTime.advanceTimeTicks(10100)
		expect(onGet).toBeCalledTimes(1)
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, active: true })

		mockStatusCode = 500
		await mockTime.advanceTimeTicks(10100)
		expect(onGet).toBeCalledTimes(2)
		expect(await generatedDevice.getStatus()).toMatchObject({
			statusCode: StatusCode.BAD,
			messages: [/status code/i],
			active: true,
		})

		mockStatusCode = 200
		await mockTime.advanceTimeTicks(10100)
		expect(onGet).toBeCalledTimes(3)
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, active: true })

		mockBody = 'sorry not sorry' // should not matter
		await mockTime.advanceTimeTicks(10100)
		expect(onGet).toBeCalledTimes(4)
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, active: true })

		mockBody = 'heres my keyword again'
		await mockTime.advanceTimeTicks(10100)
		expect(onGet).toBeCalledTimes(5)
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, active: true })

		await generatedDevice.terminate()
		jest.clearAllTimers()
		expect(onError).toHaveBeenCalledTimes(0)
	})

	test('Successful GET returns GOOD state', async () => {
		await myConductor.init()
		const generatedDeviceContainer = await myConductor.addDevice('myHTTPWatch', {
			type: DeviceType.HTTPWATCHER,
			options: {
				uri: 'http://localhost',
				httpMethod: 'get',
				expectedHttpResponse: 200,
				keyword: 'my keyword',
				interval: 10 * 1000,
			},
		})
		const generatedDevice = generatedDeviceContainer.device
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN, active: true })
		myConductor.setTimelineAndMappings([], myLayerMapping)
		await mockTime.advanceTimeTicks(10100)
		expect(onGet).toBeCalledTimes(1)
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, active: true })

		await generatedDevice.terminate()
	})
	test('Un-Successful get returns BAD state', async () => {
		const onGetLocal = jest.fn((_url, _options, callback) => {
			callback(new Error('Bad Gateway'), null)
		})
		request.setMockGet(onGetLocal)

		await myConductor.init()
		const generatedDeviceContainer = await myConductor.addDevice('myHTTPWatch', {
			type: DeviceType.HTTPWATCHER,
			options: {
				uri: 'http://localhost',
				httpMethod: 'get',
				expectedHttpResponse: 200,
				keyword: 'my keyword',
				interval: 10 * 1000,
			},
		})
		const generatedDevice = generatedDeviceContainer.device
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN, active: true })
		myConductor.setTimelineAndMappings([], myLayerMapping)

		await mockTime.advanceTimeTicks(10100)
		expect(onGetLocal).toBeCalledTimes(1)
		expect(await generatedDevice.getStatus()).toEqual({
			statusCode: StatusCode.BAD,
			messages: ['Error: Bad Gateway'],
			active: true,
		})

		await generatedDevice.terminate()
	})

	test('Un-Successful get, bad keyword, returns BAD state', async () => {
		await myConductor.init()
		const generatedDeviceContainer = await myConductor.addDevice('myHTTPWatch', {
			type: DeviceType.HTTPWATCHER,
			options: {
				uri: 'http://localhost',
				httpMethod: 'get',
				expectedHttpResponse: 200,
				keyword: 'bad keyword',
				interval: 10 * 1000,
			},
		})
		const generatedDevice = generatedDeviceContainer.device
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN, active: true })
		myConductor.setTimelineAndMappings([], myLayerMapping)

		await mockTime.advanceTimeTicks(10100)
		expect(onGet).toBeCalledTimes(1)
		expect(await generatedDevice.getStatus()).toEqual({
			statusCode: StatusCode.BAD,
			messages: ['Expected keyword "bad keyword" not found'],
			active: true,
		})

		await generatedDevice.terminate()
	})

	test('Un-Successful get, wrong status code, returns BAD state', async () => {
		const onGetLocal = jest.fn((url, _options, callback) => {
			if (url === 'http://localhost:1234') {
				callback(
					null,
					{
						statusCode: 201,
						body: 'my keyword',
					},
					'my keyword'
				)
			} else {
				callback(new Error('Unsupported mock'), null)
			}
		})
		request.setMockGet(onGetLocal)

		await myConductor.init()
		const generatedDeviceContainer = await myConductor.addDevice('myHTTPWatch', {
			type: DeviceType.HTTPWATCHER,
			options: {
				uri: 'http://localhost:1234',
				httpMethod: 'get',
				expectedHttpResponse: 200,
				keyword: 'my keyword',
				interval: 10 * 1000,
			},
		})
		const generatedDevice = generatedDeviceContainer.device
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN, active: true })
		myConductor.setTimelineAndMappings([], myLayerMapping)

		await mockTime.advanceTimeTicks(10100)
		expect(onGetLocal).toBeCalledTimes(1)
		expect(await generatedDevice.getStatus()).toEqual({
			statusCode: StatusCode.BAD,
			messages: ['Expected status code 200, got 201'],
			active: true,
		})

		await generatedDevice.terminate()
	})
	test('Successful http POST returns GOOD state', async () => {
		const onPost = jest.fn((url, _options, callback) => {
			if (url === 'http://localhost:1234') {
				callback(
					null,
					{
						statusCode: 200,
						body: 'my keyword2',
					},
					'my keyword2'
				)
			} else {
				callback(new Error('Unsupported mock'), null)
			}
		})
		request.setMockPost(onPost)

		await myConductor.init()
		const generatedDeviceContainer = await myConductor.addDevice('myHTTPWatch', {
			type: DeviceType.HTTPWATCHER,
			options: {
				uri: 'http://localhost:1234',
				httpMethod: 'post',
				expectedHttpResponse: 200,
				keyword: 'my keyword2',
				interval: 10 * 1000,
			},
		})
		const generatedDevice = generatedDeviceContainer.device
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN, active: true })
		myConductor.setTimelineAndMappings([], myLayerMapping)

		await mockTime.advanceTimeTicks(10100)
		expect(onGet).toBeCalledTimes(0)
		expect(onPost).toBeCalledTimes(1)
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, active: true })

		await generatedDevice.terminate()
	})
	test('"jibberish" http method defaults to GET and returns GOOD state', async () => {
		await myConductor.init()
		const generatedDeviceContainer = await myConductor.addDevice('myHTTPWatch', {
			type: DeviceType.HTTPWATCHER,
			options: {
				uri: 'http://localhost',
				httpMethod: 'jibberish',
				expectedHttpResponse: 200,
				keyword: 'my keyword',
				interval: 10 * 1000,
			},
		})
		const generatedDevice = generatedDeviceContainer.device
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.UNKNOWN, active: true })
		myConductor.setTimelineAndMappings([], myLayerMapping)

		await mockTime.advanceTimeTicks(10100)
		expect(onGet).toBeCalledTimes(1)
		expect(await generatedDevice.getStatus()).toEqual({ statusCode: StatusCode.GOOD, active: true })

		await generatedDevice.terminate()
	})
})
