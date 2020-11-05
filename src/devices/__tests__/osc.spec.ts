import { Conductor } from '../../conductor'
import { OSCMessageDevice } from '../osc'
import {
	MappingOSC,
	Mappings,
	DeviceType,
	TimelineContentTypeOSC,
	OSCValueType,
	TimelineObjOSCMessage,
} from '../../types/src'
import { MockTime } from '../../__tests__/mockTime'
import { literal } from '../device'
import { ThreadedClass } from 'threadedclass'
import { getMockCall } from '../../__tests__/lib'

// let nowActual = Date.now()
describe('OSC-Message', () => {
	const mockTime = new MockTime()
	beforeAll(() => {
		mockTime.mockDateNow()
	})
	beforeEach(() => {
		mockTime.init()
	})
	test('OSC message', async () => {
		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		const myLayerMapping0: MappingOSC = {
			device: DeviceType.OSC,
			deviceId: 'osc0',
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		myConductor.on('error', (e) => console.error(e))
		await myConductor.init()
		await myConductor.addDevice('osc0', {
			type: DeviceType.OSC,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1',
				port: 80,
			},
		})
		myConductor.setTimelineAndMappings([], myLayerMapping)
		await mockTime.advanceTimeToTicks(10100)

		const deviceContainer = myConductor.getDevice('osc0')
		const device = deviceContainer.device as ThreadedClass<OSCMessageDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			literal<TimelineObjOSCMessage>({
				id: 'obj0',
				enable: {
					start: mockTime.now + 1000, // in 1 second
					duration: 2000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.OSC,
					type: TimelineContentTypeOSC.OSC,

					path: '/test-path',
					values: [
						{
							type: OSCValueType.INT,
							value: 123,
						},
						{
							type: OSCValueType.FLOAT,
							value: 123.45,
						},
						{
							type: OSCValueType.STRING,
							value: 'abc',
						},
						{
							type: OSCValueType.BLOB,
							value: new Uint8Array([1, 3, 5]),
						},
					],
				},
			}),
		])

		await mockTime.advanceTimeToTicks(10990)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)
		await mockTime.advanceTimeToTicks(11100)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			type: TimelineContentTypeOSC.OSC,
			path: '/test-path',
			values: [
				{
					type: OSCValueType.INT,
					value: 123,
				},
				{
					type: OSCValueType.FLOAT,
					value: 123.45,
				},
				{
					type: OSCValueType.STRING,
					value: 'abc',
				},
				{
					type: OSCValueType.BLOB,
					value: new Uint8Array([1, 3, 5]),
				},
			],
		})
		expect(getMockCall(commandReceiver0, 0, 2)).toMatch(/added/) // context
		await mockTime.advanceTimeToTicks(16000)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
	})
	test('OSC transition', async () => {
		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		const myLayerMapping0: MappingOSC = {
			device: DeviceType.OSC,
			deviceId: 'osc0',
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		myConductor.on('error', (e) => console.error(e))
		await myConductor.init()
		await myConductor.addDevice('osc0', {
			type: DeviceType.OSC,
			options: {
				oscSender: commandReceiver0,
				host: '127.0.0.1',
				port: 80,
			},
		})
		myConductor.setTimelineAndMappings([], myLayerMapping)
		await mockTime.advanceTimeToTicks(10100)

		const deviceContainer = myConductor.getDevice('osc0')
		const device = deviceContainer.device as ThreadedClass<OSCMessageDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			literal<TimelineObjOSCMessage>({
				id: 'obj0',
				enable: {
					start: mockTime.now + 1000, // in 1 second
					duration: 2000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.OSC,
					type: TimelineContentTypeOSC.OSC,

					path: '/test-path',
					values: [
						{
							type: OSCValueType.INT,
							value: 123,
						},
						{
							type: OSCValueType.FLOAT,
							value: 123.45,
						},
						{
							type: OSCValueType.FLOAT,
							value: 118.5,
						},
						{
							type: OSCValueType.STRING,
							value: 'abc',
						},
						{
							type: OSCValueType.BLOB,
							value: new Uint8Array([1, 3, 5]),
						},
					],
					from: [
						{
							type: OSCValueType.INT,
							value: 100,
						},
						{
							type: OSCValueType.FLOAT,
							value: 100,
						},
					],
					transition: {
						duration: 1000,
						type: 'Linear',
						direction: 'None',
					},
				},
			}),
		])

		await mockTime.advanceTimeToTicks(10990)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)
		await mockTime.advanceTimeToTicks(11100)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		await mockTime.advanceTimeToTicks(12100)
		expect(commandReceiver0).toHaveBeenCalledTimes(26)

		expect(getMockCall(commandReceiver0, 0, 0)).toMatchObject({
			address: '/test-path',
			args: [
				{
					type: OSCValueType.INT,
					value: 100,
				},
				{
					type: OSCValueType.FLOAT,
					value: 100,
				},
				{
					type: OSCValueType.FLOAT,
					value: 118.5,
				},
				{
					type: OSCValueType.STRING,
					value: 'abc',
				},
				{
					type: OSCValueType.BLOB,
					value: new Uint8Array([1, 3, 5]),
				},
			],
		})
		let last = [100, 100]

		for (let i = 0; i < 26; i++) {
			const call = getMockCall(commandReceiver0, i, 0)

			expect(call.address).toEqual('/test-path')
			expect(call.args[0].value).toBeLessThanOrEqual(123)
			expect(call.args[0].value).toBeGreaterThanOrEqual(last[0])
			expect(call.args[0].value % 1).toEqual(0)
			expect(call.args[1].value).toBeLessThanOrEqual(123.45)
			expect(call.args[1].value).toBeGreaterThanOrEqual(last[1])

			last = [call.args[0].value, call.args[1].value]
		}

		await mockTime.advanceTimeToTicks(16000)
		expect(commandReceiver0).toHaveBeenCalledTimes(26)
	})
})
