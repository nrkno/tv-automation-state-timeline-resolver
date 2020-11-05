import { Conductor } from '../../conductor'
import { PanasonicPtzDevice } from '../panasonicPTZ'
import {
	Mappings,
	DeviceType,
	TimelineContentTypePanasonicPtz,
	MappingPanasonicPtz,
	MappingPanasonicPtzType,
} from '../../types/src'
import { MockTime } from '../../__tests__/mockTime'
import { ThreadedClass } from 'threadedclass'
import { getMockCall } from '../../__tests__/lib'
import * as request from '../../__mocks__/request'

const orgSetTimeout = setTimeout

describe('Panasonic PTZ', () => {
	jest.mock('request', () => request)

	const mockTime = new MockTime()

	const onGet = jest.fn((url, _options, callback) => {
		orgSetTimeout(() => {
			if (url === 'http://192.168.0.10/cgi-bin/aw_ptz?cmd=%23O&res=1') {
				callback(null, {
					statusCode: 200,
					body: 'p1',
				})
			} else {
				callback(new Error('Unsupported mock'), null)
			}
		}, 1)
	})
	request.setMockGet(onGet)

	beforeAll(() => {
		mockTime.mockDateNow()
	})
	beforeEach(() => {
		mockTime.init()
	})

	test('Panasonic PTZ: change preset', async () => {
		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		const myChannelMapping0: MappingPanasonicPtz = {
			device: DeviceType.PANASONIC_PTZ,
			deviceId: 'myPtz',
			mappingType: MappingPanasonicPtzType.PRESET,
		}
		const myChannelMapping1: MappingPanasonicPtz = {
			device: DeviceType.PANASONIC_PTZ,
			deviceId: 'myPtz',
			mappingType: MappingPanasonicPtzType.PRESET_SPEED,
		}
		const myChannelMapping2: MappingPanasonicPtz = {
			device: DeviceType.PANASONIC_PTZ,
			deviceId: 'myPtz',
			mappingType: MappingPanasonicPtzType.ZOOM,
		}
		const myChannelMapping3: MappingPanasonicPtz = {
			device: DeviceType.PANASONIC_PTZ,
			deviceId: 'myPtz',
			mappingType: MappingPanasonicPtzType.ZOOM_SPEED,
		}
		const myChannelMapping: Mappings = {
			ptz_k1: myChannelMapping0,
			ptz_k1_s: myChannelMapping1,
			ptz_k1_z: myChannelMapping2,
			ptz_k1_zs: myChannelMapping3,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		myConductor.setTimelineAndMappings([], myChannelMapping)
		await myConductor.init() // we cannot do an await, because setTimeout will never call without jest moving on.
		await myConductor.addDevice('myPtz', {
			type: DeviceType.PANASONIC_PTZ,
			options: {
				commandReceiver: commandReceiver0,
				host: '192.168.0.10',
			},
		})
		await mockTime.advanceTimeToTicks(10100)

		const deviceContainer = myConductor.getDevice('myPtz')
		const device = deviceContainer.device as ThreadedClass<PanasonicPtzDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'obj0',
				enable: {
					start: mockTime.now - 1000, // 1 seconds in the past
					duration: 2000,
				},
				layer: 'ptz_k1',
				content: {
					deviceType: DeviceType.PANASONIC_PTZ,
					type: TimelineContentTypePanasonicPtz.PRESET,
					preset: 1,
				},
			},
			{
				id: 'obj0_s',
				enable: {
					start: mockTime.now - 1000, // 1 seconds in the past
					duration: 10000,
				},
				layer: 'ptz_k1_s',
				content: {
					deviceType: DeviceType.PANASONIC_PTZ,
					type: TimelineContentTypePanasonicPtz.SPEED,
					speed: 250,
				},
			},
			{
				id: 'obj1',
				enable: {
					start: mockTime.now + 500, // 0.5 seconds in the future
					duration: 2000,
				},
				layer: 'ptz_k1',
				content: {
					deviceType: DeviceType.PANASONIC_PTZ,
					type: TimelineContentTypePanasonicPtz.PRESET,
					preset: 2,
				},
			},
			{
				id: 'obj2',
				enable: {
					start: mockTime.now + 1000, // 1 seconds in the future
					duration: 2000,
				},
				layer: 'ptz_k1',
				content: {
					deviceType: DeviceType.PANASONIC_PTZ,
					type: TimelineContentTypePanasonicPtz.PRESET,
					preset: 2,
				},
			},
			{
				id: 'obj2_s',
				enable: {
					start: mockTime.now + 1000, // 1 seconds in the future
					duration: 500,
				},
				layer: 'ptz_k1_s',
				content: {
					deviceType: DeviceType.PANASONIC_PTZ,
					type: TimelineContentTypePanasonicPtz.SPEED,
					speed: 0,
				},
			},
			{
				id: 'obj3',
				enable: {
					start: mockTime.now + 2000, // 2 seconds in the future
					duration: 2000,
				},
				layer: 'ptz_k1',
				content: {
					deviceType: DeviceType.PANASONIC_PTZ,
					type: TimelineContentTypePanasonicPtz.PRESET,
					preset: 1,
				},
			},
			{
				id: 'obj4',
				enable: {
					start: mockTime.now + 6000, // 6 seconds in the future
					duration: 2000,
				},
				layer: 'ptz_k1_z',
				content: {
					deviceType: DeviceType.PANASONIC_PTZ,
					type: TimelineContentTypePanasonicPtz.ZOOM,
					zoom: 0,
				},
			},
			{
				id: 'obj5',
				enable: {
					start: mockTime.now + 6000, // 6 seconds in the future
					duration: 2000,
				},
				layer: 'ptz_k1_zs',
				content: {
					deviceType: DeviceType.PANASONIC_PTZ,
					type: TimelineContentTypePanasonicPtz.ZOOM_SPEED,
					zoomSpeed: 1,
				},
			},
		])

		await mockTime.advanceTimeToTicks(10200)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			type: TimelineContentTypePanasonicPtz.PRESET,
			preset: 1,
		})
		expect(getMockCall(commandReceiver0, 1, 1)).toMatchObject({
			type: TimelineContentTypePanasonicPtz.SPEED,
			speed: 250,
		})

		await mockTime.advanceTimeToTicks(11000)

		expect(commandReceiver0).toHaveBeenCalledTimes(3)
		expect(getMockCall(commandReceiver0, 2, 1)).toMatchObject({
			type: TimelineContentTypePanasonicPtz.PRESET,
			preset: 2,
		})

		await mockTime.advanceTimeToTicks(11500)

		expect(commandReceiver0).toHaveBeenCalledTimes(4)
		expect(getMockCall(commandReceiver0, 3, 1)).toMatchObject({
			type: TimelineContentTypePanasonicPtz.SPEED,
			speed: 0,
		})

		await mockTime.advanceTimeToTicks(12000)

		// return speed to previous value
		expect(commandReceiver0).toHaveBeenCalledTimes(5)
		expect(getMockCall(commandReceiver0, 4, 1)).toMatchObject({
			// attribute: 'Motor dB Value',
			type: TimelineContentTypePanasonicPtz.SPEED,
			speed: 250,
		})

		await mockTime.advanceTimeToTicks(12500)

		expect(commandReceiver0).toHaveBeenCalledTimes(6)
		expect(getMockCall(commandReceiver0, 5, 1)).toMatchObject({
			// attribute: 'Motor dB Value',
			type: TimelineContentTypePanasonicPtz.PRESET,
			preset: 1,
		})
		await mockTime.advanceTimeToTicks(16000)

		expect(commandReceiver0).toHaveBeenCalledTimes(6)
		// no new commands should be sent, nothing is sent on object end

		mockTime.advanceTimeTo(16500)

		expect(commandReceiver0).toHaveBeenCalledTimes(8)
		expect(getMockCall(commandReceiver0, 6, 1)).toMatchObject({
			type: TimelineContentTypePanasonicPtz.ZOOM_SPEED,
			speed: 1,
		})
		expect(getMockCall(commandReceiver0, 7, 1)).toMatchObject({
			type: TimelineContentTypePanasonicPtz.ZOOM,
			zoom: 0,
		})
		mockTime.advanceTimeTo(18500)

		// The end of Zoom Speed object should reset zoom speed to 0
		expect(commandReceiver0).toHaveBeenCalledTimes(9)
		expect(getMockCall(commandReceiver0, 8, 1)).toMatchObject({
			type: TimelineContentTypePanasonicPtz.ZOOM_SPEED,
			speed: 0,
		})
	})
})
