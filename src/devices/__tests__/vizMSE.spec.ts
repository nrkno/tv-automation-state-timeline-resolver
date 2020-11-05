import { Conductor } from '../../conductor'
import { Mappings, DeviceType, TSRTimeline } from '../../types/src'
import { MockTime } from '../../__tests__/mockTime'
import { ThreadedClass } from 'threadedclass'
import { MappingVizMSE, TimelineContentTypeVizMSE, VIZMSETransitionType } from '../../types/src/vizMSE'
import { getMockCall } from '../../__tests__/lib'
import { VizMSEDevice } from '../vizMSE'
import * as vConnection from '../../__mocks__/v-connection'
const getMockMSEs = vConnection.getMockMSEs
type MSEMock = vConnection.MSEMock
type VRundownMocked = vConnection.VRundownMocked
import _ = require('underscore')
import { StatusCode } from '../device'

describe('vizMSE', () => {
	const mockTime = new MockTime()

	jest.mock('v-connection', () => vConnection)

	// const orgSetTimeout = setTimeout

	beforeAll(() => {
		mockTime.mockDateNow()
	})
	beforeEach(() => {
		mockTime.init()
	})
	test('vizMSE: Internal element', async () => {
		const commandReceiver0 = jest.fn(() => {
			return Promise.resolve()
		})
		const myChannelMapping0: MappingVizMSE = {
			device: DeviceType.VIZMSE,
			deviceId: 'myViz',
		}
		const myChannelMapping1: MappingVizMSE = {
			device: DeviceType.VIZMSE,
			deviceId: 'myViz',
		}
		const myChannelMapping: Mappings = {
			viz0: myChannelMapping0,
			viz_continue: myChannelMapping1,
		}

		const myConductor = new Conductor({
			multiThreadedResolver: false,
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		myConductor.setTimelineAndMappings([], myChannelMapping)
		await myConductor.init()
		await myConductor.addDevice('myViz', {
			isMultiThreaded: false,
			type: DeviceType.VIZMSE,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1',
				preloadAllElements: true,
				playlistID: 'my-super-playlist-id',
				showID: 'show1234',
				profile: 'profile9999',
			},
		})
		await mockTime.advanceTimeToTicks(10100)

		const deviceContainer = myConductor.getDevice('myViz')
		const device = deviceContainer.device as ThreadedClass<VizMSEDevice>
		await device.ignoreWaitsInTests()

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'obj0',
				enable: {
					start: mockTime.now + 5000, // 15100
					duration: 5000, // 20100
				},
				layer: 'viz0',
				content: {
					deviceType: DeviceType.VIZMSE,
					type: TimelineContentTypeVizMSE.ELEMENT_INTERNAL,
					// continueStep?: number
					// channelName?: string
					// cue?: boolean
					// noAutoPreloading?: boolean
					templateName: 'myInternalElement',
					templateData: ['line1', 'line2'],
				},
			},
			{
				id: 'obj1',
				enable: {
					start: mockTime.now + 7000, // 17100
					duration: 5000, // 22100
				},
				layer: 'viz0',
				content: {
					deviceType: DeviceType.VIZMSE,
					type: TimelineContentTypeVizMSE.ELEMENT_INTERNAL,
					templateName: 'myInternalElement2',
					templateData: ['line1'],
				},
			},
			{
				id: 'obj2',
				enable: {
					start: mockTime.now + 9000, // 19100
					duration: 500,
				},
				layer: 'viz_continue',
				content: {
					deviceType: DeviceType.VIZMSE,
					type: TimelineContentTypeVizMSE.CONTINUE,
					reference: 'viz0',
				},
			},
		])

		await mockTime.advanceTimeTicks(500) // 10500
		expect(commandReceiver0.mock.calls.length).toEqual(0)

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(14500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj0',
			// fromLookahead?: boolean
			// layerId?: string
			time: 14100,
			templateInstance: expect.stringContaining('myInternalElement'),
			type: 'prepare',
			templateName: 'myInternalElement',
			templateData: ['line1', 'line2'],
			// channelName?: string
			// noAutoPreloading?: boolean
		})

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(15500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj0',
			time: 15100,
			templateInstance: expect.stringContaining('myInternalElement'),
			type: 'take',
			templateName: 'myInternalElement',
			templateData: ['line1', 'line2'],
		})

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(16500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj1',
			time: 16100,
			templateInstance: expect.stringContaining('myInternalElement2'),
			type: 'prepare',
			templateName: 'myInternalElement2',
			templateData: ['line1'],
		})

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(17500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj1',
			time: 17100,
			templateInstance: expect.stringContaining('myInternalElement2'),
			type: 'take',
			templateName: 'myInternalElement2',
			templateData: ['line1'],
		})

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(19500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj2',
			time: 19100,
			templateInstance: expect.stringContaining('myInternalElement2'),
			type: 'continue',
			templateName: 'myInternalElement2',
			templateData: ['line1'],
		})

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(22500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj1',
			time: 22100,
			templateInstance: expect.stringContaining('myInternalElement2'),
			type: 'out',
			templateName: 'myInternalElement2',
			templateData: ['line1'],
		})
	})
	test('vizMSE: External/Pilot element', async () => {
		let device: any = undefined
		const commandReceiver0 = jest.fn((...args) => {
			return device._defaultCommandReceiver(...args)
		})

		const myChannelMapping0: MappingVizMSE = {
			device: DeviceType.VIZMSE,
			deviceId: 'myViz',
		}
		const myChannelMapping1: MappingVizMSE = {
			device: DeviceType.VIZMSE,
			deviceId: 'myViz',
		}
		const myChannelMapping: Mappings = {
			viz0: myChannelMapping0,
			viz_continue: myChannelMapping1,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		const onError = jest.fn()
		myConductor.on('error', onError)

		myConductor.setTimelineAndMappings([], myChannelMapping)
		await myConductor.init()
		await myConductor.addDevice('myViz', {
			type: DeviceType.VIZMSE,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1',
				preloadAllElements: true,
				playlistID: 'my-super-playlist-id',
				showID: 'show1234',
				profile: 'profile9999',
			},
		})
		await mockTime.advanceTimeToTicks(10100)

		const deviceContainer = myConductor.getDevice('myViz')
		device = deviceContainer.device as ThreadedClass<VizMSEDevice>
		await device.ignoreWaitsInTests()
		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'obj0',
				enable: {
					start: mockTime.now + 5000, // 15100
					duration: 5000, // 20100
				},
				layer: 'viz0',
				content: {
					deviceType: DeviceType.VIZMSE,
					type: TimelineContentTypeVizMSE.ELEMENT_PILOT,
					// continueStep?: number
					// cue?: boolean
					// noAutoPreloading?: boolean
					channelName: 'FULL1',
					templateVcpId: 1337,
				},
			},
			{
				id: 'obj1',
				enable: {
					start: mockTime.now + 7000, // 17100
					duration: 5000, // 22100
				},
				layer: 'viz0',
				content: {
					deviceType: DeviceType.VIZMSE,
					type: TimelineContentTypeVizMSE.ELEMENT_PILOT,
					channelName: 'FULL1',
					templateVcpId: 1338,
				},
			},
			{
				id: 'obj2',
				enable: {
					start: mockTime.now + 9000, // 19100
					duration: 500,
				},
				layer: 'viz_continue',
				content: {
					deviceType: DeviceType.VIZMSE,
					type: TimelineContentTypeVizMSE.CONTINUE,
					reference: 'viz0',
				},
			},
		])

		await mockTime.advanceTimeTicks(500) // 10500
		expect(commandReceiver0.mock.calls.length).toEqual(0)

		const mse = _.last(getMockMSEs()) as MSEMock
		expect(mse).toBeTruthy()
		expect(mse.getMockRundowns()).toHaveLength(1)
		const rundown = _.last(mse.getMockRundowns()) as VRundownMocked
		expect(rundown).toBeTruthy()

		expect(await device.supportsExpectedPlayoutItems).toEqual(true)
		await device.handleExpectedPlayoutItems([
			{
				templateName: 1337,
				// templateData?: string[]
				channelName: 'FULL1',
				// noAutoPreloading?: boolean
			},
			{
				templateName: 1336,
				// templateData?: string[]
				channelName: 'FULL1',
				// noAutoPreloading?: boolean
			},
		])
		await mockTime.advanceTimeTicks(100)

		expect(rundown.createElement).toHaveBeenCalledTimes(2)
		expect(rundown.createElement).toHaveBeenNthCalledWith(1, 1337, 'FULL1')
		expect(rundown.createElement).toHaveBeenNthCalledWith(2, 1336, 'FULL1')
		rundown.createElement.mockClear()

		await myConductor.devicesMakeReady(true)

		expect(rundown.activate).toHaveBeenCalledTimes(2)

		expect(rundown.getElement).toHaveBeenCalledTimes(4)
		expect(rundown.getElement).nthCalledWith(1, 1337)
		expect(rundown.getElement).nthCalledWith(2, 1336)

		expect(rundown.createElement).toHaveBeenCalledTimes(2)
		expect(rundown.createElement).toHaveBeenNthCalledWith(1, 1337, 'FULL1')
		expect(rundown.createElement).toHaveBeenNthCalledWith(2, 1336, 'FULL1')

		expect(rundown.initialize).toHaveBeenCalledTimes(2)
		expect(rundown.initialize).nthCalledWith(1, 1337)
		expect(rundown.initialize).nthCalledWith(2, 1336)

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(14500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj0',
			// fromLookahead?: boolean
			// layerId?: string
			time: 14100,
			templateInstance: expect.stringContaining('pilot_1337'),
			type: 'prepare',
			templateName: 1337,
			channelName: 'FULL1',
			// noAutoPreloading?: boolean
		})

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(15500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj0',
			time: 15100,
			templateInstance: expect.stringContaining('pilot_1337'),
			type: 'take',
			templateName: 1337,
			channelName: 'FULL1',
		})

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(16500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj1',
			time: 16100,
			templateInstance: expect.stringContaining('pilot_1338'),
			type: 'prepare',
			templateName: 1338,
			channelName: 'FULL1',
		})

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(17500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj1',
			time: 17100,
			templateInstance: expect.stringContaining('pilot_1338'),
			type: 'take',
			templateName: 1338,
			channelName: 'FULL1',
		})

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(19500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj2',
			time: 19100,
			templateInstance: expect.stringContaining('pilot_1338'),
			type: 'continue',
			templateName: 1338,
			channelName: 'FULL1',
		})

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(22500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj1',
			time: 22100,
			templateInstance: expect.stringContaining('pilot_1338'),
			type: 'out',
			templateName: 1338,
			channelName: 'FULL1',
		})

		// manually load elements:
		commandReceiver0.mockClear()
		rundown.getElement.mockClear()
		rundown.createElement.mockClear()
		rundown.initialize.mockClear()

		await device.handleExpectedPlayoutItems([
			{
				templateName: 1337,
				channelName: 'FULL1',
			},
			{
				templateName: 1336,
				channelName: 'FULL1',
			},
			{
				templateName: 9999,
				channelName: 'FULL1',
			},
		])

		myConductor.setTimelineAndMappings([
			{
				id: 'loadAll',
				enable: {
					start: 25000,
					duration: 500, // 25500
				},
				layer: 'viz0',
				content: {
					deviceType: DeviceType.VIZMSE,
					type: TimelineContentTypeVizMSE.LOAD_ALL_ELEMENTS,
				},
			},
		])

		await mockTime.advanceTimeToTicks(24900)

		expect(rundown.createElement).toHaveBeenCalledTimes(1)
		expect(rundown.createElement).toHaveBeenNthCalledWith(1, 9999, 'FULL1')
		expect(rundown.initialize).toHaveBeenCalledTimes(0)

		rundown.getElement.mockClear()
		rundown.createElement.mockClear()
		rundown.initialize.mockClear()

		await mockTime.advanceTimeToTicks(25500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'loadAll',
			time: 25000,
			type: 'load_all_elements',
		})

		expect(rundown.initialize).toHaveBeenCalledTimes(1)
		expect(rundown.initialize).nthCalledWith(1, 9999)

		expect(rundown.deactivate).toHaveBeenCalledTimes(0)
		await myConductor.devicesStandDown(true)
		expect(rundown.deactivate).toHaveBeenCalledTimes(1)

		expect(onError).toHaveBeenCalledTimes(0)
	})
	test('vizMSE: bad init options & basic functionality', async () => {
		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		const onError = jest.fn()
		myConductor.on('error', onError)
		const onWarning = jest.fn()
		myConductor.on('warning', onWarning)

		await myConductor.init()

		await expect(
			myConductor.addDevice('myViz', {
				type: DeviceType.VIZMSE,
				options: {
					// host: '127.0.0.1',
					// @ts-expect-error: testing bad option
					showID: 'show1234',
					// @ts-expect-error: testing bad option
					profile: 'myProfile',
				},
			})
		).rejects.toMatch(/bad option/)
		await expect(
			// @ts-expect-error: testing bad option
			myConductor.addDevice('myViz', {
				type: DeviceType.VIZMSE,
				options: {
					host: '127.0.0.1',
					// showID: 'show1234',
					profile: 'myProfile',
				},
			})
		).rejects.toMatch(/bad option/)
		await expect(
			// @ts-expect-error: testing bad option
			myConductor.addDevice('myViz', {
				type: DeviceType.VIZMSE,
				options: {
					host: '127.0.0.1',
					showID: 'show1234',
					// profile: 'myProfile'
				},
			})
		).rejects.toMatch(/bad option/)

		expect(onError).toHaveBeenCalledTimes(3)
		onError.mockClear()

		const deviceContainer = await myConductor.addDevice('myViz', {
			type: DeviceType.VIZMSE,
			options: {
				host: '127.0.0.1',
				showID: 'show1234',
				profile: 'myProfile',
			},
		})
		const device = deviceContainer.device
		const connectionChanged = jest.fn()
		await device.on('connectionChanged', connectionChanged)

		const mse = _.last(getMockMSEs()) as MSEMock
		expect(mse).toBeTruthy()
		expect(mse.getMockRundowns()).toHaveLength(1)

		expect(connectionChanged).toHaveBeenCalledTimes(0)
		expect(await device.getStatus()).toMatchObject({
			statusCode: StatusCode.GOOD,
		})
		connectionChanged.mockClear()

		mse.mockSetDisconnected()

		await mockTime.advanceTimeTicks(100)
		expect(connectionChanged).toHaveBeenCalledTimes(1)
		expect(await device.getStatus()).toMatchObject({
			statusCode: StatusCode.BAD,
		})
		connectionChanged.mockClear()

		mse.mockSetConnected()

		await mockTime.advanceTimeTicks(100)
		expect(connectionChanged).toHaveBeenCalledTimes(1)
		expect(await device.getStatus()).toMatchObject({
			statusCode: StatusCode.GOOD,
		})

		expect(await device.terminate()).toEqual(true)

		await mockTime.advanceTimeTicks(1000)

		expect(onError).toHaveBeenCalledTimes(0)
		expect(onWarning).toHaveBeenCalledTimes(0)
	})
	test('vizMSE: clear all elements', async () => {
		const commandReceiver0 = jest.fn(() => {
			return Promise.resolve()
		})
		const myChannelMapping0: MappingVizMSE = {
			device: DeviceType.VIZMSE,
			deviceId: 'myViz',
		}
		const myChannelMapping1: MappingVizMSE = {
			device: DeviceType.VIZMSE,
			deviceId: 'myViz',
		}
		const myChannelMapping: Mappings = {
			viz0: myChannelMapping0,
			viz_continue: myChannelMapping1,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		myConductor.setTimelineAndMappings([], myChannelMapping)
		await myConductor.init()
		await myConductor.addDevice('myViz', {
			type: DeviceType.VIZMSE,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1',
				preloadAllElements: true,
				playlistID: 'my-super-playlist-id',
				showID: 'show1234',
				profile: 'profile9999',
				clearAllTemplateName: 'clear_all_of_them',
				clearAllCommands: ['RENDERER*FRONT_LAYER SET_OBJECT ', 'RENDERER SET_OBJECT '],
			},
		})
		await mockTime.advanceTimeToTicks(10100)

		const deviceContainer = myConductor.getDevice('myViz')
		const device = deviceContainer.device as ThreadedClass<VizMSEDevice>
		await device.ignoreWaitsInTests()

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'obj0',
				enable: {
					start: mockTime.now, // 10100
					duration: 10 * 1000, // 20100
				},
				layer: 'viz0',
				content: {
					deviceType: DeviceType.VIZMSE,
					type: TimelineContentTypeVizMSE.ELEMENT_INTERNAL,
					templateName: 'myInternalElement',
					templateData: [],
				},
			},
			{
				id: 'clearAll',
				enable: {
					start: mockTime.now + 5000, // 15100
					duration: 1000, // 16100
				},
				layer: 'viz0',
				content: {
					deviceType: DeviceType.VIZMSE,
					type: TimelineContentTypeVizMSE.CLEAR_ALL_ELEMENTS,
					channelsToSendCommands: ['OVL', 'FULL'],
					commands: ['RENDERER*FRONT_LAYER SET_OBJECT ', 'RENDERER SET_OBJECT '],
				},
			},
		] as TSRTimeline)

		// await mockTime.advanceTimeTicks(500) // 10500
		// expect(commandReceiver0.mock.calls.length).toEqual(0)

		// commandReceiver0.mockClear()
		// await mockTime.advanceTimeToTicks(14500)
		// expect(commandReceiver0.mock.calls.length).toEqual(1)
		// expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
		// 	timelineObjId: 'obj0',
		// 	time: 14100,
		// 	templateInstance: expect.stringContaining('myInternalElement'),
		// 	type: 'prepare',
		// 	templateName: 'myInternalElement',
		// 	templateData: []
		// })

		// commandReceiver0.mockClear()
		// await mockTime.advanceTimeToTicks(100)
		await mockTime.advanceTimeTicks(500) // 10500
		expect(commandReceiver0.mock.calls.length).toEqual(2)

		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj0',
			time: 10105,
			templateInstance: expect.stringContaining('myInternalElement'),
			type: 'prepare',
			templateName: 'myInternalElement',
			templateData: [],
		})
		expect(getMockCall(commandReceiver0, 1, 1)).toMatchObject({
			timelineObjId: 'obj0',
			time: 10105,
			templateInstance: expect.stringContaining('myInternalElement'),
			type: 'take',
			templateName: 'myInternalElement',
			templateData: [],
		})

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(15500)
		expect(commandReceiver0.mock.calls.length).toEqual(3)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'clearAll',
			time: 15100,
			type: 'clear_all_elements',
			templateName: 'clear_all_of_them',
		})
		expect(getMockCall(commandReceiver0, 1, 1)).toMatchObject({
			timelineObjId: 'clearAll',
			time: 15100,
			type: 'clear_all_engines',
			channels: ['OVL', 'FULL'],
			commands: ['RENDERER*FRONT_LAYER SET_OBJECT ', 'RENDERER SET_OBJECT '],
		})
		expect(getMockCall(commandReceiver0, 2, 1)).toMatchObject({
			timelineObjId: 'obj0',
			time: 15150,
			templateInstance: expect.stringContaining('myInternalElement'),
			type: 'prepare',
			templateName: 'myInternalElement',
			templateData: [],
		})

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(16500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj0',
			time: 16100,
			templateInstance: expect.stringContaining('myInternalElement'),
			type: 'take',
			templateName: 'myInternalElement',
			templateData: [],
		})

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(20500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj0',
			time: 20100,
			templateInstance: expect.stringContaining('myInternalElement'),
			type: 'out',
			templateName: 'myInternalElement',
			templateData: [],
		})
	})
	test('vizMSE: Delayed External/Pilot element', async () => {
		let device: any = undefined
		const commandReceiver0 = jest.fn((...args) => {
			return device._defaultCommandReceiver(...args)
		})

		const myChannelMapping0: MappingVizMSE = {
			device: DeviceType.VIZMSE,
			deviceId: 'myViz',
		}
		const myChannelMapping1: MappingVizMSE = {
			device: DeviceType.VIZMSE,
			deviceId: 'myViz',
		}
		const myChannelMapping: Mappings = {
			viz0: myChannelMapping0,
			viz_continue: myChannelMapping1,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		const onError = jest.fn()
		myConductor.on('error', onError)

		myConductor.setTimelineAndMappings([], myChannelMapping)
		await myConductor.init()
		await myConductor.addDevice('myViz', {
			type: DeviceType.VIZMSE,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1',
				preloadAllElements: true,
				playlistID: 'my-super-playlist-id',
				showID: 'show1234',
				profile: 'profile9999',
			},
		})
		await mockTime.advanceTimeToTicks(10100)

		const deviceContainer = myConductor.getDevice('myViz')
		device = deviceContainer.device as ThreadedClass<VizMSEDevice>
		await device.ignoreWaitsInTests()

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		const mse = _.last(getMockMSEs()) as MSEMock
		expect(mse).toBeTruthy()
		expect(mse.getMockRundowns()).toHaveLength(1)
		const rundown = _.last(mse.getMockRundowns()) as VRundownMocked
		expect(rundown).toBeTruthy()

		myConductor.setTimelineAndMappings([
			{
				id: 'obj0',
				enable: {
					start: mockTime.now + 5000, // 15100
					duration: 5000, // 20100
				},
				layer: 'viz0',
				content: {
					deviceType: DeviceType.VIZMSE,
					type: TimelineContentTypeVizMSE.ELEMENT_PILOT,
					channelName: 'FULL1',
					templateVcpId: 1337,
					outTransition: {
						type: VIZMSETransitionType.DELAY,
						delay: 1000,
					},
				},
			},
		])

		await mockTime.advanceTimeToTicks(14000)
		expect(commandReceiver0.mock.calls.length).toEqual(0)

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(14500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			timelineObjId: 'obj0',
			time: 14100,
			type: 'prepare',
			templateName: 1337,
			channelName: 'FULL1',
		})

		commandReceiver0.mockClear()
		rundown.take.mockClear()
		await mockTime.advanceTimeToTicks(15500)
		expect(commandReceiver0.mock.calls.length).toEqual(1)
		expect(rundown.take).toHaveBeenCalledTimes(1)
		expect(rundown.take).nthCalledWith(1, 1337)
		expect(rundown.out).toHaveBeenCalledTimes(0)

		commandReceiver0.mockClear()
		rundown.out.mockClear()
		rundown.take.mockClear()
		await mockTime.advanceTimeToTicks(20500)
		expect(rundown.out).toHaveBeenCalledTimes(0) // because it's delayed!

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(21200)
		expect(rundown.out).toHaveBeenCalledTimes(1)
		expect(rundown.out).nthCalledWith(1, 1337)
		expect(rundown.take).toHaveBeenCalledTimes(0)

		expect(onError).toHaveBeenCalledTimes(0)
	})
})
