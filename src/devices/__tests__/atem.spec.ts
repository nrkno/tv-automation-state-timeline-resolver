import { Enums, AtemConnection } from 'atem-state'
import { ResolvedTimelineObjectInstance } from 'superfly-timeline'
import { Conductor } from '../../conductor'
import { AtemDevice, DeviceOptionsAtemInternal } from '../atem'
import { MockTime } from '../../__tests__/mockTime'
import {
	Mappings,
	DeviceType ,
	MappingAtem,
	MappingAtemType,
	TimelineContentTypeAtem,
	AtemOptions,
	AtemTransitionStyle
} from '../../types/src'
import { ThreadedClass } from 'threadedclass'
import { TimelineState } from '../../types/src/superfly-timeline'
import { literal } from '../device'
import { getMockCall } from '../../__tests__/lib'

describe('Atem', () => {
	let mockTime = new MockTime()

	function compareAtemCommands (received: AtemConnection.Commands.ISerializableCommand, expected: AtemConnection.Commands.ISerializableCommand) {
		expect(received.constructor.name).toEqual(expected.constructor.name)
		expect(received.serialize(AtemConnection.Enums.ProtocolVersion.V8_0)).toEqual(expected.serialize(AtemConnection.Enums.ProtocolVersion.V8_0))
	}

	beforeAll(() => {
		mockTime.mockDateNow()
	})
	beforeEach(() => {
		mockTime.init()
	})

	test('Atem: Ensure clean initial state', async () => {
		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		const mockState: TimelineState = {
			time: mockTime.now + 50,
			layers: {},
			nextEvents: []
		}

		let device = new AtemDevice('mock', literal<DeviceOptionsAtemInternal>({
			type: DeviceType.ATEM,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1'
			}
		}), mockTime.getCurrentTime)

		await device.init(literal<AtemOptions>({
			host: '127.0.0.1'
		}))

		device.handleState(mockState, {})

		device.queue.forEach((cmd) => {
			console.log(cmd)
		})
		expect(device.queue).toHaveLength(0)
	})

	test('Atem: switch input', async () => {

		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		let myLayerMapping0: MappingAtem = {
			device: DeviceType.ATEM,
			deviceId: 'myAtem',
			mappingType: MappingAtemType.MixEffect,
			index: 0
		}
		let myLayerMapping: Mappings = {
			'myLayer0': myLayerMapping0
		}

		let myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime
		})
		await myConductor.init()
		await myConductor.addDevice('myAtem', literal<DeviceOptionsAtemInternal>({
			type: DeviceType.ATEM,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1',
				port: 9910
			}
		}))

		await mockTime.advanceTimeToTicks(10100)

		let deviceContainer = myConductor.getDevice('myAtem')
		let device = deviceContainer.device as ThreadedClass<AtemDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'obj0',
				enable: {
					start: mockTime.now - 1000, // 1 seconds ago
					duration: 2000
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.ATEM,
					type: TimelineContentTypeAtem.ME,
					me: {
						input: 2,
						transition: AtemTransitionStyle.CUT
					}
				}
			},
			{
				id: 'obj1',
				enable: {
					start: '#obj0.end',
					duration: 2000
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.ATEM,
					type: TimelineContentTypeAtem.ME,
					me: {
						input: 3,
						transition: AtemTransitionStyle.CUT
					}
				}
			}
		], myLayerMapping)

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(10200)
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		compareAtemCommands(getMockCall(commandReceiver0, 0, 1), new AtemConnection.Commands.PreviewInputCommand(0, 2))
		compareAtemCommands(getMockCall(commandReceiver0, 1, 1), new AtemConnection.Commands.CutCommand(0))

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(12200)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		compareAtemCommands(getMockCall(commandReceiver0, 0, 1), new AtemConnection.Commands.PreviewInputCommand(0, 3))
		compareAtemCommands(getMockCall(commandReceiver0, 1, 1), new AtemConnection.Commands.CutCommand(0))
	})

	test('Atem: upstream keyer', async () => {

		const commandReceiver0: any = jest.fn(() => {
			// nothing
		})
		let myLayerMapping0: MappingAtem = {
			device: DeviceType.ATEM,
			deviceId: 'myAtem',
			mappingType: MappingAtemType.MixEffect,
			index: 0
		}
		let myLayerMapping: Mappings = {
			'myLayer0': myLayerMapping0
		}

		let myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime
		})
		await myConductor.init()
		await myConductor.addDevice('myAtem', literal<DeviceOptionsAtemInternal>({
			type: DeviceType.ATEM,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1',
				port: 9910
			}
		}))

		await mockTime.advanceTimeToTicks(10100)

		let deviceContainer = myConductor.getDevice('myAtem')
		let device = deviceContainer.device as ThreadedClass<AtemDevice>
		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)
		myConductor.setTimelineAndMappings([
			{
				id: 'obj0',
				enable: {
					start: mockTime.now - 1000, // 1 seconds ago
					duration: 2000
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.ATEM,
					type: TimelineContentTypeAtem.ME,
					me: {
						upstreamKeyers: [
							{
								upstreamKeyerId: 0,

								lumaSettings: {
									preMultiplied: false,
									clip: 300,
									gain: 2,
									invert: true
								}
							}
						]
					}
				}
			}
		], myLayerMapping)

		await mockTime.advanceTimeToTicks(10200)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		const cmd = new AtemConnection.Commands.MixEffectKeyLumaCommand(0, 0)
		cmd.updateProps({
			clip: 300,
			gain: 2,
			invert: true
		})
		compareAtemCommands(getMockCall(commandReceiver0, 0, 1), cmd)
	})

	test('Atem: handle same state', async () => {

		const commandReceiver0 = jest.fn(() => {
			return Promise.resolve()
		})
		const myLayerMapping: Mappings = {
			'myLayer0': literal<MappingAtem>({
				device: DeviceType.ATEM,
				deviceId: 'mock',
				mappingType: MappingAtemType.MixEffect,
				index: 0
			})
		}

		const resolvedObj: ResolvedTimelineObjectInstance = {
			id: 'obj0',
			enable: {
				start: mockTime.now - 1000, // 1 seconds ago
				duration: 0
			},
			layer: 'myLayer0',
			content: {
				type: TimelineContentTypeAtem.ME,
				me: {
					input: 4,
					transition: Enums.TransitionStyle.CUT
				}
			},
			resolved: {
				resolved: true,
				resolving: false,
				instances: [{ start: mockTime.now - 1000, end: Infinity, id: 'a0', references: [] }],
				directReferences: []
			},
			instance: { start: mockTime.now - 1000, end: Infinity, id: 'a0', references: [] }
		}
		const mockState: TimelineState = {
			time: mockTime.now + 50,
			layers: {
				'myLayer0': resolvedObj
			},
			nextEvents: []
		}

		let device = new AtemDevice('mock', {
			type: DeviceType.ATEM,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1'
			}
		}, mockTime.getCurrentTime)

		await device.init(literal<AtemOptions>({
			host: '127.0.0.1'
		}))

		// Check that no commands has been scheduled
		expect(device.queue).toHaveLength(0)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)

		// Expect that a command has been scheduled
		device.handleState(mockState, myLayerMapping)
		expect(device.queue).toHaveLength(2)

		// Handle the same state, before the commands have been sent
		mockTime.advanceTimeTo(mockTime.now + 30)
		device.handleState(mockState, myLayerMapping)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)
		expect(device.queue).toHaveLength(2)

		// Send the commands
		mockTime.advanceTimeTo(mockTime.now + 30)
		expect(commandReceiver0).toHaveBeenCalledTimes(2)

		// Handle the same state, after the commands have been sent
		device.handleState(mockState, myLayerMapping)
		expect(device.queue).toHaveLength(0)
	})

	test('Atem: handleState timing order', async () => {

		const commandReceiver0 = jest.fn(() => {
			return Promise.resolve()
		})
		const myLayerMapping: Mappings = {
			'myLayer0': literal<MappingAtem>({
				device: DeviceType.ATEM,
				deviceId: 'myAtem',
				mappingType: MappingAtemType.MixEffect,
				index: 0
			})
		}

		const resolvedObj: ResolvedTimelineObjectInstance = {
			id: 'obj0',
			enable: {
				start: mockTime.now - 1000, // 1 seconds ago
				duration: 0
			},
			layer: 'myLayer0',
			content: {
				type: TimelineContentTypeAtem.ME,
				me: {
					input: 4,
					transition: Enums.TransitionStyle.CUT
				}
			},
			resolved: {
				resolved: true,
				resolving: false,
				instances: [{ start: mockTime.now - 1000, end: Infinity, id: 'a0', references: [] }]
			},
			instance: { start: mockTime.now - 1000, end: Infinity, id: 'a0', references: [] }
		}
		const mockState: TimelineState = {
			time: mockTime.now,
			layers: {
				'myLayer0': resolvedObj
			},
			nextEvents: []
		}

		let device = new AtemDevice('mock', {
			type: DeviceType.ATEM,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1'
			}
		}, mockTime.getCurrentTime)
		device.setMapping(myLayerMapping)

		await device.init(literal<AtemOptions>({
			host: '127.0.0.1'
		}))

		// Check that no commands has been scheduled
		expect(device.queue).toHaveLength(0)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)

		// Expect that a command has been scheduled
		device.handleState(mockState)
		expect(mockTime.getCurrentTime()).toEqual(10000)
		expect(device.queue).toHaveLength(2)

		// Handle the same state and time, before the commands have been sent
		device.handleState(mockState)
		expect(mockTime.getCurrentTime()).toEqual(10000)
		expect(commandReceiver0).toHaveBeenCalledTimes(0)
		expect(device.queue).toHaveLength(2)

		// send the commands
		mockTime.advanceTime(0)
		await mockTime.tick()
		expect(mockTime.getCurrentTime()).toEqual(10000)
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(device.queue).toHaveLength(0)

		// Handle the same state and time, now that the commands have been sent
		device.handleState(mockState)
		expect(mockTime.getCurrentTime()).toEqual(10000)
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(device.queue).toHaveLength(0)
	})
})
