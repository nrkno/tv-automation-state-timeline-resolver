import { Conductor } from '../../conductor'
import { HyperdeckDevice } from '../hyperdeck'
import { RecordCommand, StopCommand } from 'hyperdeck-connection/dist/commands'
import * as HyperdeckConnection from '../../__mocks__/hyperdeck-connection'
import {
	Mappings,
	DeviceType,
	TimelineContentTypeHyperdeck,
	MappingHyperdeck,
	MappingHyperdeckType,
	TransportStatus,
} from '../../types/src'
import { MockTime } from '../../__tests__/mockTime'
import { ThreadedClass } from 'threadedclass'
import { getMockCall } from '../../__tests__/lib'

const myChannelMapping0: MappingHyperdeck = {
	device: DeviceType.HYPERDECK,
	deviceId: 'hyperdeck0',
	mappingType: MappingHyperdeckType.TRANSPORT,
}

describe('Hyperdeck', () => {
	jest.mock('hyperdeck-connection', () => HyperdeckConnection)

	const mockTime = new MockTime()

	beforeAll(() => {
		mockTime.mockDateNow()
	})
	beforeEach(() => {
		mockTime.init()
	})

	test('Hyperdeck: Record', async () => {
		let device: ThreadedClass<HyperdeckDevice> | undefined = undefined

		const commandReceiver0: any = jest.fn((...args: any[]) => {
			// Just forward the command:

			return (device as any)._defaultCommandReceiver(...args)
		})
		const myChannelMapping: Mappings = {
			hyperdeck0_transport: myChannelMapping0,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		myConductor.setTimelineAndMappings([], myChannelMapping)

		await myConductor.init()
		await myConductor.addDevice('hyperdeck0', {
			type: DeviceType.HYPERDECK,
			options: {
				host: '127.0.0.1',
				port: 9993,
				commandReceiver: commandReceiver0,
			},
		})
		await mockTime.advanceTimeToTicks(10100)

		expect(commandReceiver0).toHaveBeenCalledTimes(0)

		const hyperdeckInstances = HyperdeckConnection.Hyperdeck.getMockInstances()
		expect(hyperdeckInstances).toHaveLength(1)

		const hyperdeckMock: HyperdeckConnection.Hyperdeck = hyperdeckInstances[0]

		const hyperdeckMockCommand = jest.fn(() => {
			return Promise.resolve()
		})
		hyperdeckMock.setMockCommandReceiver(hyperdeckMockCommand)

		const deviceContainer = myConductor.getDevice('hyperdeck0')
		device = deviceContainer.device as ThreadedClass<HyperdeckDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)
		myConductor.setTimelineAndMappings([
			{
				id: 'obj0',
				enable: {
					start: 9000,
					duration: 2000, // 11000
				},
				layer: 'hyperdeck0_transport',
				content: {
					deviceType: DeviceType.HYPERDECK,
					type: TimelineContentTypeHyperdeck.TRANSPORT,

					status: TransportStatus.RECORD,
					recordFilename: 'sofie_dev',
				},
			},
			{
				id: 'obj1',
				enable: {
					start: 10500,
					duration: 2000,
				},
				layer: 'hyperdeck0_transport',
				content: {
					deviceType: DeviceType.HYPERDECK,
					type: TimelineContentTypeHyperdeck.TRANSPORT,

					status: TransportStatus.PREVIEW,
				},
			},
		])

		await mockTime.advanceTimeToTicks(10200)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toBeInstanceOf(RecordCommand)
		expect(getMockCall(commandReceiver0, 0, 1)).toHaveProperty('filename', 'sofie_dev')
		expect(getMockCall(commandReceiver0, 0, 2)).toBeTruthy() // context
		// also test the actual command sent to hyperdeck:
		expect(hyperdeckMockCommand).toHaveBeenCalledTimes(1)
		// @todo: fix this test:
		// expect(getMockCall(hyperdeckMockCommand, 0, 0)).toBeInstanceOf(RecordCommand)
		expect(getMockCall(hyperdeckMockCommand, 0, 0)).toMatchObject({
			filename: 'sofie_dev',
		})

		myConductor.setTimelineAndMappings(myConductor.timeline) // Same timeline
		await mockTime.advanceTimeToTicks(10400)
		expect(hyperdeckMockCommand).toHaveBeenCalledTimes(1) // nothing has changed, so it should not be called again

		await mockTime.advanceTimeToTicks(12000)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 1, 1)).toBeInstanceOf(StopCommand)
		expect(getMockCall(commandReceiver0, 1, 2)).toBeTruthy() // context

		await mockTime.advanceTimeToTicks(13000)
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		// no new commands should have been sent, becuse obj2 is the same as obj1
	})
})
