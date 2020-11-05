import { Conductor } from '../../conductor'
import { HTTPSendDevice } from '../httpSend'
import { MappingHTTPSend, Mappings, DeviceType } from '../../types/src'
import { MockTime } from '../../__tests__/mockTime'
import { ThreadedClass } from 'threadedclass'
import { TimelineObjHTTPRequest, TimelineContentTypeHTTP } from '../../types/src/httpSend'
import { getMockCall } from '../../__tests__/lib'

// let nowActual = Date.now()
describe('HTTP-Send', () => {
	const mockTime = new MockTime()
	beforeAll(() => {
		mockTime.mockDateNow()
	})
	beforeEach(() => {
		mockTime.init()
	})
	test('POST message', async () => {
		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		const myLayerMapping0: MappingHTTPSend = {
			device: DeviceType.HTTPSEND,
			deviceId: 'myHTTP',
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init()
		await myConductor.addDevice('myHTTP', {
			type: DeviceType.HTTPSEND,
			options: {
				commandReceiver: commandReceiver0,
			},
		})
		myConductor.setTimelineAndMappings([], myLayerMapping)
		await mockTime.advanceTimeToTicks(10100)

		const deviceContainer = myConductor.getDevice('myHTTP')
		const device = deviceContainer.device as ThreadedClass<HTTPSendDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'obj0',
				enable: {
					start: mockTime.now + 1000, // in 1 second
					duration: 2000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.HTTPSEND,
					type: TimelineContentTypeHTTP.POST,

					url: 'http://superfly.tv',
					params: {
						a: 1,
						b: 2,
					},
				},
			},
		])
		await mockTime.advanceTimeToTicks(10990)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)
		await mockTime.advanceTimeToTicks(11100)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toBeCalledWith(
			expect.anything(),
			expect.objectContaining({
				type: 'post',
				url: 'http://superfly.tv',
				params: {
					a: 1,
					b: 2,
				},
			}),
			expect.anything(),
			expect.stringContaining('obj0')
		)
		expect(getMockCall(commandReceiver0, 0, 2)).toMatch(/added/) // context
		await mockTime.advanceTimeToTicks(16000)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
	})
	test('POST message, ordering of commands', async () => {
		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		const myLayerMapping0: MappingHTTPSend = {
			device: DeviceType.HTTPSEND,
			deviceId: 'myHTTP',
		}
		// let myLayerMapping1: MappingHTTPSend = {
		// 	device: DeviceType.HTTPSEND,
		// 	deviceId: 'myHTTP'
		// }
		// let myLayerMapping2: MappingHTTPSend = {
		// 	device: DeviceType.HTTPSEND,
		// 	deviceId: 'myHTTP'
		// }
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
			myLayer1: myLayerMapping0,
			myLayer2: myLayerMapping0,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init()
		await myConductor.addDevice('myHTTP', {
			type: DeviceType.HTTPSEND,
			options: {
				commandReceiver: commandReceiver0,
			},
		})
		myConductor.setTimelineAndMappings([], myLayerMapping)
		await mockTime.advanceTimeToTicks(10100)

		const deviceContainer = myConductor.getDevice('myHTTP')
		const device = deviceContainer.device as ThreadedClass<HTTPSendDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		const timeline: Array<TimelineObjHTTPRequest> = [
			{
				id: 'obj0',
				enable: {
					start: mockTime.now + 1000, // in 1 second
					duration: 2000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.HTTPSEND,
					type: 'POST' as TimelineContentTypeHTTP.POST,

					url: 'http://superfly.tv/1',
					params: {},
					temporalPriority: 1,
				},
			},
			{
				id: 'obj1',
				enable: {
					start: mockTime.now + 1000, // in 1 second
					duration: 2000,
				},
				layer: 'myLayer1',
				content: {
					deviceType: DeviceType.HTTPSEND,
					type: 'POST' as TimelineContentTypeHTTP.POST,

					url: 'http://superfly.tv/2',
					params: {},
					temporalPriority: 3,
				},
			},
			{
				id: 'obj2',
				enable: {
					start: mockTime.now + 1000, // in 1 second
					duration: 2000,
				},
				layer: 'myLayer2',
				content: {
					deviceType: DeviceType.HTTPSEND,
					type: 'POST' as TimelineContentTypeHTTP.POST,

					url: 'http://superfly.tv/3',
					params: {},
					temporalPriority: 2,
				},
			},
		]
		myConductor.setTimelineAndMappings(timeline)

		await mockTime.advanceTimeToTicks(10990)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)
		await mockTime.advanceTimeToTicks(11100)

		// Expecting to see the ordering below:
		expect(commandReceiver0).toHaveBeenCalledTimes(3)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			expect.anything(),
			expect.objectContaining({ url: 'http://superfly.tv/1' }),
			expect.anything(),
			expect.stringContaining('obj0')
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			expect.anything(),
			expect.objectContaining({ url: 'http://superfly.tv/3' }),
			expect.anything(),
			expect.stringContaining('obj2')
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			3,
			expect.anything(),
			expect.objectContaining({ url: 'http://superfly.tv/2' }),
			expect.anything(),
			expect.stringContaining('obj1')
		)
	})
})
