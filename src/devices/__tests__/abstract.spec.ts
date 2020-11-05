import { Mappings, DeviceType, MappingAbstract } from '../../types/src'
import { Conductor } from '../../conductor'
import { AbstractDevice } from '../abstract'
import { StatusCode } from '../device'
import { MockTime } from '../../__tests__/mockTime'
import { ThreadedClass } from 'threadedclass'
import { getMockCall } from '../../__tests__/lib'

describe('Abstract device', () => {
	const mockTime = new MockTime()
	beforeAll(() => {
		mockTime.mockDateNow()
	})
	beforeEach(() => {
		mockTime.init()
	})
	test('Abstract device methods', async () => {
		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		const myLayerMapping0: MappingAbstract = {
			device: DeviceType.ABSTRACT,
			deviceId: 'myAbstract',
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init()
		await myConductor.addDevice('myAbstract', {
			type: DeviceType.ABSTRACT,
			options: {
				commandReceiver: commandReceiver0,
			},
		})
		await mockTime.advanceTimeToTicks(10100)

		const deviceContainer = myConductor.getDevice('myAbstract')
		const device = deviceContainer.device as ThreadedClass<AbstractDevice>

		device.terminate = jest.fn(device.terminate)
		const onError = jest.fn()
		const onDebug = jest.fn()
		device.on('error', onError).catch(() => null)
		device.on('debug', onDebug).catch(() => null)

		expect(await device.canConnect).toBeFalsy()
		expect(await device.connected).toBeFalsy()
		expect(await device.deviceName).toMatch(/abstract/i)
		expect(await device.getStatus()).toMatchObject({ statusCode: StatusCode.GOOD })

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: mockTime.now - 1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.ABSTRACT,
						tmp0: 'abc',
					},
				},
				{
					id: 'obj1',
					enable: {
						start: '#obj0.end',
						duration: 1000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.ABSTRACT,
						tmp0: 'abcde',
					},
				},
			],
			myLayerMapping
		)

		await mockTime.advanceTimeToTicks(10200)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			commandName: 'addedAbstract',
			content: {
				deviceType: 0, // abstract
				tmp0: 'abc',
			},
			context: 'added: obj0',
		})

		await mockTime.advanceTimeToTicks(11200)
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 1, 1)).toMatchObject({
			commandName: 'changedAbstract',
			content: {
				deviceType: 0, // abstract
				tmp0: 'abcde',
			},
			context: 'changed: obj1',
		})

		await mockTime.advanceTimeToTicks(15000)
		expect(commandReceiver0).toHaveBeenCalledTimes(3)
		expect(getMockCall(commandReceiver0, 2, 1)).toMatchObject({
			commandName: 'removedAbstract',
			content: {
				deviceType: 0, // abstract
				tmp0: 'abcde',
			},
			context: 'removed: obj1',
		})
		await myConductor.removeDevice(await device.deviceId)

		expect(device.terminate).toHaveBeenCalledTimes(1)
		expect(myConductor.getDevice('myAbstract')).toBeFalsy()

		expect(onError).toHaveBeenCalledTimes(0)
	})
	test('Abstract without mock', async () => {
		const myLayerMapping0: MappingAbstract = {
			device: DeviceType.ABSTRACT,
			deviceId: 'myAbstract',
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init()
		await myConductor.addDevice('myAbstract', {
			type: DeviceType.ABSTRACT,
			options: {},
		})
		await mockTime.advanceTimeToTicks(10100)

		const deviceContainer = myConductor.getDevice('myAbstract')
		const device = deviceContainer.device as ThreadedClass<AbstractDevice>

		device.terminate = jest.fn(device.terminate)
		const onError = jest.fn()
		const onDebug = jest.fn()
		device.on('error', onError).catch(() => null)
		device.on('debug', onDebug).catch(() => null)

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: mockTime.now - 1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.ABSTRACT,
					},
				},
			],
			myLayerMapping
		)

		await mockTime.advanceTimeToTicks(10200)
		expect(onDebug).toHaveBeenCalledTimes(1)

		await myConductor.removeDevice(await device.deviceId)

		expect(device.terminate).toHaveBeenCalledTimes(1)
		expect(myConductor.getDevice('myAbstract')).toBeFalsy()

		expect(onError).toHaveBeenCalledTimes(0)
	})
})
