import { Conductor } from '../../conductor'
import {
	TimelineContentTypeCasparCg,
	MappingCasparCG,
	Mappings,
	DeviceType,
	ChannelFormat,
	Transition,
	Ease,
	Direction,
	TSRTimeline,
} from '../../types/src'
import { MockTime } from '../../__tests__/mockTime'
import { getMockCall } from '../../__tests__/lib'
import { AMCP } from 'casparcg-connection'

// usage logCalls(commandReceiver0)
// function logCalls (fcn) {
// 	console.log('calls')
// 	fcn.mock.calls.forEach((call) => {
// 		console.log(call[0], call[1])
// 	})
// }

describe('CasparCG', () => {
	const mockTime = new MockTime()
	beforeAll(() => {
		mockTime.mockDateNow()
	})
	beforeEach(() => {
		mockTime.init()
	})
	test('CasparCG: Play AMB for 60s', async () => {
		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		const myLayerMapping0: MappingCasparCG = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			channel: 2,
			layer: 42,
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init() // we cannot do an await, because setTimeout will never call without jest moving on.
		await myConductor.addDevice('myCCG', {
			type: DeviceType.CASPARCG,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1',
				useScheduling: true,
			},
		})
		await mockTime.advanceTimeToTicks(10100)

		expect(commandReceiver0).toHaveBeenCalledTimes(3)

		expect(getMockCall(commandReceiver0, 0, 1)._objectParams).toMatchObject({ channel: 1, timecode: '00:00:10:00' })
		expect(getMockCall(commandReceiver0, 1, 1)._objectParams).toMatchObject({ channel: 2, timecode: '00:00:10:00' })
		expect(getMockCall(commandReceiver0, 2, 1)._objectParams).toMatchObject({ channel: 3, timecode: '00:00:10:00' })

		commandReceiver0.mockClear()

		const deviceContainer = myConductor.getDevice('myCCG')
		const device = deviceContainer.device

		// Check that no commands has been scheduled:
		expect(await device['queue']).toHaveLength(0)

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: mockTime.getCurrentTime() - 1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'AMB',
						loop: true,
					},
				},
			],
			myLayerMapping
		)

		await mockTime.advanceTimeToTicks(10200)

		// one command has been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 0, 1)._objectParams).toMatchObject({
			channel: 2,
			layer: 42,
			noClear: false,
			clip: 'AMB',
			loop: true,
			seek: 0, // looping and seeking nos supported when length not provided
		})

		// advance time to end of clip:
		await mockTime.advanceTimeToTicks(11200)

		// two commands have been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 1, 1).name).toEqual('ScheduleSetCommand')
		expect(getMockCall(commandReceiver0, 1, 1)._objectParams.command.name).toEqual('ClearCommand')
		expect(getMockCall(commandReceiver0, 1, 1)._objectParams.command.channel).toEqual(2)
		expect(getMockCall(commandReceiver0, 1, 1)._objectParams.command.layer).toEqual(42)
	})
	test('CasparCG: Play AMB for 60s, start at 10s', async () => {
		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		const myLayerMapping0: MappingCasparCG = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			channel: 2,
			layer: 42,
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init() // we cannot do an await, because setTimeout will never call without jest moving on.
		await myConductor.addDevice('myCCG', {
			type: DeviceType.CASPARCG,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1',
				useScheduling: true,
			},
		})
		await mockTime.advanceTimeToTicks(10100)

		expect(commandReceiver0).toHaveBeenCalledTimes(3)

		expect(getMockCall(commandReceiver0, 0, 1)._objectParams).toMatchObject({ channel: 1, timecode: '00:00:10:00' })
		expect(getMockCall(commandReceiver0, 1, 1)._objectParams).toMatchObject({ channel: 2, timecode: '00:00:10:00' })
		expect(getMockCall(commandReceiver0, 2, 1)._objectParams).toMatchObject({ channel: 3, timecode: '00:00:10:00' })

		commandReceiver0.mockClear()

		const deviceContainer = myConductor.getDevice('myCCG')
		const device = deviceContainer.device

		// Check that no commands has been scheduled:
		expect(await device['queue']).toHaveLength(0)

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: mockTime.getCurrentTime() - 10000, // 10 seconds ago
						duration: 60000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'AMB',
					},
				},
			],
			myLayerMapping
		)

		await mockTime.advanceTimeToTicks(10200)

		// one command has been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1)._objectParams).toMatchObject({
			channel: 2,
			layer: 42,
			noClear: false,
			clip: 'AMB',
			seek: 25 * 10,
		})
	})
	test('CasparCG: Play AMB for 60s in 50fps', async () => {
		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		const myLayerMapping0: MappingCasparCG = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			channel: 2,
			layer: 42,
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init() // we cannot do an await, because setTimeout will never call without jest moving on.
		await myConductor.addDevice('myCCG', {
			type: DeviceType.CASPARCG,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1',
				useScheduling: false,
				fps: 50,
			},
		})
		await mockTime.advanceTimeToTicks(10100)

		commandReceiver0.mockClear()

		const deviceContainer = myConductor.getDevice('myCCG')
		const device = deviceContainer.device

		// Check that no commands has been scheduled:
		expect(await (device as any)['queue']).toHaveLength(0)

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: mockTime.getCurrentTime() - 1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'AMB',
						loop: true,
						inPoint: 0,
						length: 60 * 1000,
					},
				},
			],
			myLayerMapping
		)

		await mockTime.advanceTimeToTicks(10200)

		// one command has been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1)._objectParams).toMatchObject({
			channel: 2,
			layer: 42,
			noClear: false,
			clip: 'AMB',
			loop: true,
			seek: 50,
			in: 0,
			length: 60 * 50,
		})

		// advance time to end of clip:
		await mockTime.advanceTimeToTicks(11200)

		// two commands have been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 1, 1)).toBeInstanceOf(AMCP.ClearCommand)
		expect(getMockCall(commandReceiver0, 1, 1)._objectParams.channel).toEqual(2)
		expect(getMockCall(commandReceiver0, 1, 1)._objectParams.layer).toEqual(42)
	})

	test('CasparCG: Play IP input for 60s', async () => {
		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		const myLayerMapping0: MappingCasparCG = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			channel: 2,
			layer: 42,
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init()
		await myConductor.addDevice('myCCG', {
			type: DeviceType.CASPARCG,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1',
				useScheduling: false,
			},
		})

		const deviceContainer = myConductor.getDevice('myCCG')
		const device = deviceContainer.device

		// Check that no commands has been scheduled:
		expect(await device['queue']).toHaveLength(0)
		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: mockTime.getCurrentTime() - 1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.IP,

						uri: 'rtsp://127.0.0.1:5004',
					},
				},
			],
			myLayerMapping
		)
		await mockTime.advanceTimeTicks(100)

		// one command has been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1)._objectParams).toMatchObject({
			channel: 2,
			layer: 42,
			noClear: false,
			clip: 'rtsp://127.0.0.1:5004',
			seek: 0, // can't seek in an ip input
		})

		// advance time to end of clip:
		await mockTime.advanceTimeTicks(2000)

		// two commands have been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		// expect(getMockCall(commandReceiver0, 1, 1).name).toEqual('ScheduleSetCommand')
		expect(getMockCall(commandReceiver0, 1, 1).name).toEqual('ClearCommand')
		expect(getMockCall(commandReceiver0, 1, 1).channel).toEqual(2)
		expect(getMockCall(commandReceiver0, 1, 1).layer).toEqual(42)
	})

	test('CasparCG: Play decklink input for 60s', async () => {
		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		const myLayerMapping0: MappingCasparCG = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			channel: 2,
			layer: 42,
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init()
		await myConductor.addDevice('myCCG', {
			type: DeviceType.CASPARCG,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1',
				useScheduling: true,
			},
		})

		const deviceContainer = myConductor.getDevice('myCCG')
		const device = deviceContainer.device

		// Check that no commands has been scheduled:
		expect(await device['queue']).toHaveLength(0)

		// await mockTime.advanceTimeToTicks(10050)
		// expect(commandReceiver0).toHaveBeenCalledTimes(3)

		// await mockTime.advanceTimeToTicks(10010)

		await mockTime.advanceTimeToTicks(10050)
		expect(commandReceiver0).toHaveBeenCalledTimes(3)
		expect(getMockCall(commandReceiver0, 0, 1).name).toEqual('TimeCommand')
		expect(getMockCall(commandReceiver0, 1, 1).name).toEqual('TimeCommand')
		expect(getMockCall(commandReceiver0, 2, 1).name).toEqual('TimeCommand')

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: 9000,
						duration: 2000, // 11000
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.INPUT,

						device: 1,
						inputType: 'decklink',
						deviceFormat: ChannelFormat.HD_720P5000,
					},
				},
			],
			myLayerMapping
		)
		await mockTime.advanceTimeToTicks(10100)

		// one command has been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(5)

		expect(getMockCall(commandReceiver0, 3, 1).name).toEqual('PlayDecklinkCommand')
		expect(getMockCall(commandReceiver0, 3, 1)._objectParams).toMatchObject({
			channel: 2,
			layer: 42,
			device: 1,
			format: ChannelFormat.HD_720P5000,
		})

		expect(getMockCall(commandReceiver0, 4, 1).name).toEqual('ScheduleSetCommand')
		expect(getMockCall(commandReceiver0, 4, 1)._objectParams.command.name).toEqual('ClearCommand')
		expect(getMockCall(commandReceiver0, 4, 1)._objectParams.command._objectParams).toMatchObject({
			channel: 2,
			layer: 42,
		})

		// advance time to end of clip:
		// await mockTime.advanceTimeToTicks(11200)

		// two commands have been sent:
		// expect(commandReceiver0).toHaveBeenCalledTimes(5)
	})

	test('CasparCG: Play template for 60s', async () => {
		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		const myLayerMapping0: MappingCasparCG = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			channel: 2,
			layer: 42,
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init()
		await myConductor.addDevice('myCCG', {
			type: DeviceType.CASPARCG,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1',
				useScheduling: true,
			},
		})

		const deviceContainer = myConductor.getDevice('myCCG')
		const device = deviceContainer.device

		// Check that no commands has been scheduled:
		expect(await device['queue']).toHaveLength(0)

		await mockTime.advanceTimeToTicks(10050)
		expect(commandReceiver0).toHaveBeenCalledTimes(3)
		expect(getMockCall(commandReceiver0, 0, 1).name).toEqual('TimeCommand')
		expect(getMockCall(commandReceiver0, 1, 1).name).toEqual('TimeCommand')
		expect(getMockCall(commandReceiver0, 2, 1).name).toEqual('TimeCommand')

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: 9000,
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.TEMPLATE,

						name: 'LT',
						data: {
							f0: 'Hello',
							f1: 'World',
						},
						useStopCommand: true,
					},
				},
			],
			myLayerMapping
		)

		await mockTime.advanceTimeToTicks(10100)

		// one command has been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(5)
		expect(getMockCall(commandReceiver0, 3, 1).name).toEqual('CGAddCommand')
		expect(getMockCall(commandReceiver0, 3, 1)._objectParams).toMatchObject({
			channel: 2,
			layer: 42,
			noClear: false,
			templateName: 'LT',
			flashLayer: 1,
			playOnLoad: true,
			data: { f0: 'Hello', f1: 'World' },
			cgStop: true,
			templateType: 'html',
		})

		expect(getMockCall(commandReceiver0, 4, 1).name).toEqual('ScheduleSetCommand')
		expect(getMockCall(commandReceiver0, 4, 1)._objectParams.command.name).toEqual('CGStopCommand')
	})

	test('CasparCG: Play template for 60s', async () => {
		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		const myLayerMapping0: MappingCasparCG = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			channel: 2,
			layer: 42,
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init()
		await myConductor.addDevice('myCCG', {
			type: DeviceType.CASPARCG,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1',
				useScheduling: true,
			},
		})

		const deviceContainer = myConductor.getDevice('myCCG')
		const device = deviceContainer.device

		// Check that no commands has been scheduled:
		expect(await device['queue']).toHaveLength(0)

		await mockTime.advanceTimeToTicks(10050)
		expect(commandReceiver0).toHaveBeenCalledTimes(3)
		expect(getMockCall(commandReceiver0, 0, 1).name).toEqual('TimeCommand')
		expect(getMockCall(commandReceiver0, 1, 1).name).toEqual('TimeCommand')
		expect(getMockCall(commandReceiver0, 2, 1).name).toEqual('TimeCommand')

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: 9000,
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.RECORD,

						file: 'RECORDING',
						encoderOptions: '-format mkv -c:v libx264 -crf 22',
					},
				},
			],
			myLayerMapping
		)

		await mockTime.advanceTimeToTicks(10100)

		// one command has been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(5)
		expect(getMockCall(commandReceiver0, 3, 1).name).toEqual('CustomCommand')
		expect(getMockCall(commandReceiver0, 3, 1)._objectParams).toMatchObject({
			channel: 2,
			layer: 42,
			noClear: false,
			media: 'RECORDING',
			encoderOptions: '-format mkv -c:v libx264 -crf 22',
			command: 'ADD 2 FILE RECORDING -format mkv -c:v libx264 -crf 22',
			customCommand: 'add file',
		})

		expect(getMockCall(commandReceiver0, 4, 1).name).toEqual('ScheduleSetCommand')
		expect(getMockCall(commandReceiver0, 4, 1)._objectParams.command.name).toEqual('CustomCommand')
	})

	test('CasparCG: Play 2 routes for 60s', async () => {
		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		const myLayerMapping0: MappingCasparCG = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			channel: 2,
			layer: 42,
		}
		const myLayerMapping1: MappingCasparCG = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			channel: 1,
			layer: 42,
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
			myLayer1: myLayerMapping1,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init()
		await myConductor.addDevice('myCCG', {
			type: DeviceType.CASPARCG,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1',
				useScheduling: true,
			},
		})

		const deviceContainer = myConductor.getDevice('myCCG')
		const device = deviceContainer.device
		await device['_ccgState']

		// Check that no commands has been scheduled:
		expect(await device['queue']).toHaveLength(0)

		await mockTime.advanceTimeToTicks(10050)
		expect(commandReceiver0).toHaveBeenCalledTimes(3)
		expect(getMockCall(commandReceiver0, 0, 1).name).toEqual('TimeCommand')
		expect(getMockCall(commandReceiver0, 1, 1).name).toEqual('TimeCommand')
		expect(getMockCall(commandReceiver0, 2, 1).name).toEqual('TimeCommand')

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: 9000,
						duration: 3000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.ROUTE,

						mappedLayer: 'myLayer1',
						delay: 80, // * 1000, // @todo: because reasons, TSR uses fps of 0.025, which breaks all calculations in CasparCG-state
						mode: 'BACKGROUND',
					},
				},
				{
					id: 'obj1',
					enable: {
						start: 11000,
						duration: 1000,
					},
					layer: 'myLayer1',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.ROUTE,

						channel: 2,
						layer: 23,
						delay: 320, // * 1000
					},
				},
			],
			myLayerMapping
		)

		await mockTime.advanceTimeToTicks(10100)

		// one command has been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(7)
		expect(getMockCall(commandReceiver0, 3, 1)._objectParams).toMatchObject({
			channel: 2,
			layer: 42,
			noClear: false,
			routeChannel: 1,
			routeLayer: 42,
			command: 'PLAY 2-42 route://1-42 BACKGROUND FRAMES_DELAY 2',
			customCommand: 'route',
		})

		await mockTime.advanceTimeToTicks(11000)

		// expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 4, 1)._objectParams.command._objectParams).toMatchObject({
			channel: 1,
			layer: 42,
			noClear: false,
			routeChannel: 2,
			routeLayer: 23,
			command: 'PLAY 1-42 route://2-23 FRAMES_DELAY 8',
			customCommand: 'route',
		})

		// advance time to end of clip:
		await mockTime.advanceTimeToTicks(12000)

		// two more commands have been sent:
		// expect(commandReceiver0).toHaveBeenCalledTimes(4)
		// expect 2 clear commands:
		expect(getMockCall(commandReceiver0, 5, 1)._objectParams.command.name).toEqual('ClearCommand')
		expect(getMockCall(commandReceiver0, 6, 1)._objectParams.command.name).toEqual('ClearCommand')
	})

	test('CasparCG: AMB with transitions', async () => {
		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		const myLayerMapping0: MappingCasparCG = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			channel: 2,
			layer: 42,
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init()
		await myConductor.addDevice('myCCG', {
			type: DeviceType.CASPARCG,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1',
				useScheduling: true,
			},
		})

		// Check that no commands has been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(0)

		await mockTime.advanceTimeToTicks(10050)
		expect(commandReceiver0).toHaveBeenCalledTimes(3)
		expect(getMockCall(commandReceiver0, 0, 1).name).toEqual('TimeCommand')
		expect(getMockCall(commandReceiver0, 1, 1).name).toEqual('TimeCommand')
		expect(getMockCall(commandReceiver0, 2, 1).name).toEqual('TimeCommand')

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: mockTime.getCurrentTime() - 1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'AMB',

						transitions: {
							inTransition: {
								type: Transition.MIX,
								duration: 1000,
								easing: Ease.LINEAR,
								direction: Direction.LEFT,
							},
							outTransition: {
								type: Transition.MIX,
								duration: 1000,
								easing: Ease.LINEAR,
								direction: Direction.RIGHT,
							},
						},
					},
				},
			],
			myLayerMapping
		)

		// fast-forward:
		await mockTime.advanceTimeTicks(100)
		// Check that an ACMP-command has been sent
		expect(commandReceiver0).toHaveBeenCalledTimes(5)
		expect(getMockCall(commandReceiver0, 3, 1).name).toEqual('PlayCommand')
		expect(getMockCall(commandReceiver0, 3, 1)._objectParams).toMatchObject({
			channel: 2,
			layer: 42,
			noClear: false,
			transition: 'MIX',
			transitionDuration: 25,
			transitionEasing: 'LINEAR',
			transitionDirection: 'LEFT',
			clip: 'AMB',
			seek: 25,
			loop: false,
		})
		expect(getMockCall(commandReceiver0, 4, 1).name).toEqual('ScheduleSetCommand')
		expect(getMockCall(commandReceiver0, 4, 1)._objectParams.command.name).toEqual('PlayCommand')
		expect(getMockCall(commandReceiver0, 4, 1)._objectParams.command._objectParams).toMatchObject({
			channel: 2,
			layer: 42,
			transition: 'MIX',
			transitionDuration: 25,
			transitionEasing: 'LINEAR',
			transitionDirection: 'RIGHT',
			clip: 'empty',
		})

		// Nothing more should've happened:
		await mockTime.advanceTimeToTicks(10400)

		expect(commandReceiver0.mock.calls.length).toBe(5)
	})

	test('CasparCG: Mixer commands', async () => {
		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		const myLayerMapping0: MappingCasparCG = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			channel: 2,
			layer: 42,
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		myConductor.on('error', (e) => {
			throw new Error(e)
		})
		myConductor.on('warning', (msg) => {
			console.warn(msg)
		})
		await myConductor.init()
		await myConductor.addDevice('myCCG', {
			type: DeviceType.CASPARCG,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1',
				useScheduling: true,
			},
		})

		// Check that no commands has been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(0)

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: mockTime.getCurrentTime() - 1000, // 1 seconds ago
						duration: 12000, // 12s
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA, // more to be implemented later!
						file: 'AMB',
						loop: true,
					},
					keyframes: [
						{
							id: 'kf1',
							enable: {
								start: 500, // 0 = parent's start
								duration: 5500,
							},
							content: {
								mixer: {
									perspective: {
										topLeftX: 0,
										topLeftY: 0,
										topRightX: 0.5,
										topRightY: 0,
										bottomRightX: 0.5,
										bottomRightY: 1,
										bottomLeftX: 0,
										bottomLeftY: 1,
									},
								},
							},
						},
						{
							id: 'kf2',
							enable: {
								start: 6000, // 0 = parent's start
								duration: 6000,
							},
							content: {
								mixer: {
									perspective: {
										topLeftX: 0,
										topLeftY: 0,
										topRightX: 1,
										topRightY: 0,
										bottomRightX: 1,
										bottomRightY: 1,
										bottomLeftX: 0,
										bottomLeftY: 1,
									},
								},
							},
						},
					],
				},
			],
			myLayerMapping
		)

		// fast-forward:
		await mockTime.advanceTimeTicks(100)

		// Check that ACMP-commands has been sent
		expect(commandReceiver0).toHaveBeenCalledTimes(5)
		// we've already tested play commands so let's check the mixer command:
		expect(getMockCall(commandReceiver0, 1, 1).name).toMatch(/MixerPerspectiveCommand/)
		expect(getMockCall(commandReceiver0, 1, 1)._objectParams).toMatchObject({
			channel: 2,
			layer: 42,
			topLeftX: 0,
			topLeftY: 0,
			topRightX: 0.5,
			topRightY: 0,
			bottomRightX: 0.5,
			bottomRightY: 1,
			bottomLeftX: 0,
			bottomLeftY: 1,
			keyword: 'PERSPECTIVE',
		})

		// fast-forward:
		await mockTime.advanceTimeTicks(5000)

		expect(commandReceiver0.mock.calls).toHaveLength(6)
		// expect(CasparCG.mockDo.mock.calls[2][0]).toBeInstanceOf(AMCP.StopCommand);
		expect(getMockCall(commandReceiver0, 5, 1)._objectParams.command.name).toMatch(/MixerPerspectiveCommand/)
		expect(getMockCall(commandReceiver0, 5, 1)._objectParams.command._objectParams).toMatchObject({
			channel: 2,
			layer: 42,
			topLeftX: 0,
			topLeftY: 0,
			topRightX: 1,
			topRightY: 0,
			bottomRightX: 1,
			bottomRightY: 1,
			bottomLeftX: 0,
			bottomLeftY: 1,
			keyword: 'PERSPECTIVE',
		})
	})

	test('CasparCG: loadbg command', async () => {
		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		const myLayerMapping0: MappingCasparCG = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			channel: 2,
			layer: 42,
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init()
		await myConductor.addDevice('myCCG', {
			type: DeviceType.CASPARCG,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1',
				timeBase: 50,
				useScheduling: true,
			},
		})

		expect(mockTime.getCurrentTime()).toEqual(10000)

		await mockTime.advanceTimeToTicks(10050)
		expect(commandReceiver0).toHaveBeenCalledTimes(3)
		expect(getMockCall(commandReceiver0, 0, 1).name).toEqual('TimeCommand')
		expect(getMockCall(commandReceiver0, 1, 1).name).toEqual('TimeCommand')
		expect(getMockCall(commandReceiver0, 2, 1).name).toEqual('TimeCommand')

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0_bg',
					enable: {
						start: 10000,
						duration: 1200,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'AMB',
						loop: true,
					},
					isLookahead: true,
				},
				{
					id: 'obj0',
					enable: {
						start: 11200, // 1.2 seconds in the future
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'AMB',
						loop: true,
					},
				},
			],
			myLayerMapping
		)

		await mockTime.advanceTimeTicks(100)
		expect(commandReceiver0).toHaveBeenCalledTimes(5)
		expect(getMockCall(commandReceiver0, 3, 1).name).toEqual('LoadbgCommand')
		expect(getMockCall(commandReceiver0, 3, 1)._objectParams).toMatchObject({
			channel: 2,
			layer: 42,
			noClear: false,
			clip: 'AMB',
			auto: false,
			loop: true,
			seek: 0,
			clearOn404: true,
		})
		expect(getMockCall(commandReceiver0, 4, 1).name).toEqual('ScheduleSetCommand')
		expect(getMockCall(commandReceiver0, 4, 1)._objectParams.timecode).toEqual('00:00:11:10') // 11s 10 frames == 1.2 s @50fpx

		expect(getMockCall(commandReceiver0, 4, 1)._objectParams.command.name).toEqual('PlayCommand')
		expect(getMockCall(commandReceiver0, 4, 1)._objectParams.command._objectParams).toEqual({
			channel: 2,
			layer: 42,
			noClear: false,
		})

		await mockTime.advanceTimeTicks(2000)
		expect(commandReceiver0).toHaveBeenCalledTimes(6)
		expect(getMockCall(commandReceiver0, 5, 1).name).toEqual('ScheduleSetCommand')
		expect(getMockCall(commandReceiver0, 5, 1)._objectParams.command.name).toEqual('ClearCommand')
		expect(getMockCall(commandReceiver0, 5, 1)._objectParams.command._objectParams).toEqual({
			channel: 2,
			layer: 42,
		})
	})

	test('CasparCG: load command', async () => {
		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		const myLayerMapping0: MappingCasparCG = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			channel: 2,
			layer: 42,
			previewWhenNotOnAir: true,
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init()
		await myConductor.addDevice('myCCG', {
			type: DeviceType.CASPARCG,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1',
				timeBase: 50,
				useScheduling: true,
			},
		})

		expect(mockTime.getCurrentTime()).toEqual(10000)

		await mockTime.advanceTimeToTicks(10050)
		expect(commandReceiver0).toHaveBeenCalledTimes(3)
		expect(getMockCall(commandReceiver0, 0, 1).name).toEqual('TimeCommand')
		expect(getMockCall(commandReceiver0, 1, 1).name).toEqual('TimeCommand')
		expect(getMockCall(commandReceiver0, 2, 1).name).toEqual('TimeCommand')

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0_bg',
					enable: {
						start: 10000,
						duration: 1200,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'AMB',
						loop: true,
					},
					isLookahead: true,
				},
				{
					id: 'obj0',
					enable: {
						start: 11200, // 1.2 seconds in the future
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'AMB',
						loop: true,
					},
				},
			],
			myLayerMapping
		)

		await mockTime.advanceTimeTicks(100)
		expect(commandReceiver0).toHaveBeenCalledTimes(5)
		expect(getMockCall(commandReceiver0, 3, 1).name).toEqual('LoadCommand')
		expect(getMockCall(commandReceiver0, 3, 1)._objectParams).toMatchObject({
			channel: 2,
			layer: 42,
			noClear: false,
			clip: 'AMB',
			loop: true,
			seek: 0,
			clearOn404: true,
		})
		expect(getMockCall(commandReceiver0, 4, 1).name).toEqual('ScheduleSetCommand')
		expect(getMockCall(commandReceiver0, 4, 1)._objectParams.timecode).toEqual('00:00:11:10') // 11s 10 frames == 1.2 s @50fpx

		expect(getMockCall(commandReceiver0, 4, 1)._objectParams.command.name).toEqual('ResumeCommand')
		expect(getMockCall(commandReceiver0, 4, 1)._objectParams.command._objectParams).toEqual({
			channel: 2,
			layer: 42,
			noClear: false,
		})

		await mockTime.advanceTimeTicks(2000)
		expect(commandReceiver0).toHaveBeenCalledTimes(6)
		expect(getMockCall(commandReceiver0, 5, 1).name).toEqual('ScheduleSetCommand')
		expect(getMockCall(commandReceiver0, 5, 1)._objectParams.command.name).toEqual('ClearCommand')
		expect(getMockCall(commandReceiver0, 5, 1)._objectParams.command._objectParams).toEqual({
			channel: 2,
			layer: 42,
		})
	})

	test('CasparCG: Schedule Play, then change my mind', async () => {
		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		const myLayerMapping0: MappingCasparCG = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			channel: 2,
			layer: 42,
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init()
		await myConductor.addDevice('myCCG', {
			type: DeviceType.CASPARCG,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1',
				timeBase: 50,
				useScheduling: true,
			},
		})

		await mockTime.advanceTimeToTicks(10050)
		expect(commandReceiver0).toHaveBeenCalledTimes(3)
		expect(getMockCall(commandReceiver0, 0, 1).name).toEqual('TimeCommand')
		expect(getMockCall(commandReceiver0, 1, 1).name).toEqual('TimeCommand')
		expect(getMockCall(commandReceiver0, 2, 1).name).toEqual('TimeCommand')

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0_bg',
					enable: {
						start: 10000,
						duration: 1200, // 11200
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'AMB',
						loop: true,
					},
					isLookahead: true,
				},
				{
					id: 'obj0',
					enable: {
						start: 11200, // 1.2 seconds in the future
						duration: 2000, // 13200
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'AMB',
						loop: true,
					},
				},
			],
			myLayerMapping
		)

		await mockTime.advanceTimeToTicks(10100)
		expect(commandReceiver0).toHaveBeenCalledTimes(5)
		expect(getMockCall(commandReceiver0, 3, 1).name).toEqual('LoadbgCommand')
		expect(getMockCall(commandReceiver0, 3, 1)._objectParams).toMatchObject({
			channel: 2,
			layer: 42,
			noClear: false,
			clip: 'AMB',
			auto: false,
			loop: true,
			seek: 0,
		})
		expect(getMockCall(commandReceiver0, 4, 1).name).toEqual('ScheduleSetCommand')
		expect(getMockCall(commandReceiver0, 4, 1)._objectParams.timecode).toEqual('00:00:11:10') // 11s 10 frames == 1.2 s @ 50 fps

		expect(getMockCall(commandReceiver0, 4, 1)._objectParams.command.name).toEqual('PlayCommand')
		expect(getMockCall(commandReceiver0, 4, 1)._objectParams.command._objectParams).toEqual({
			channel: 2,
			layer: 42,
			noClear: false,
		})

		const tokenPlay = getMockCall(commandReceiver0, 4, 1)._objectParams.token

		// then change my mind:
		myConductor.setTimelineAndMappings([])
		await mockTime.advanceTimeToTicks(10200)

		expect(commandReceiver0).toHaveBeenCalledTimes(7)
		// expect(getMockCall(commandReceiver0, 3, 1).name).toEqual('ClearCommand')
		expect(getMockCall(commandReceiver0, 5, 1).name).toEqual('ScheduleRemoveCommand')
		expect(getMockCall(commandReceiver0, 5, 1)._stringParamsArray[0]).toEqual(tokenPlay)
		expect(getMockCall(commandReceiver0, 6, 1).name).toEqual('LoadbgCommand')
		expect(getMockCall(commandReceiver0, 6, 1)._objectParams).toMatchObject({
			channel: 2,
			layer: 42,
			clip: 'EMPTY',
		})

		await mockTime.advanceTimeToTicks(13000) //  10100
		expect(commandReceiver0).toHaveBeenCalledTimes(7)
	})
	test('CasparCG: Play a looping video, then continue looping', async () => {
		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		const myLayerMapping0: MappingCasparCG = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			channel: 1,
			layer: 10,
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init()
		await myConductor.addDevice('myCCG', {
			type: DeviceType.CASPARCG,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1',
				timeBase: 50,
				useScheduling: true,
			},
		})

		await mockTime.advanceTimeToTicks(10050)
		expect(commandReceiver0).toHaveBeenCalledTimes(3)
		expect(getMockCall(commandReceiver0, 0, 1).name).toEqual('TimeCommand')
		expect(getMockCall(commandReceiver0, 1, 1).name).toEqual('TimeCommand')
		expect(getMockCall(commandReceiver0, 2, 1).name).toEqual('TimeCommand')

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: 10000,
						duration: 5000, // 15000
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'AMB',
						loop: true,
					},
				},
				{
					id: 'obj1',
					enable: {
						start: '#obj0.end', // 15000
						duration: 5000, // 20000
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'AMB',
						loop: true,
					},
				},
			],
			myLayerMapping
		)

		await mockTime.advanceTimeToTicks(30000)
		expect(commandReceiver0).toHaveBeenCalledTimes(5)

		expect(getMockCall(commandReceiver0, 3, 1).name).toEqual('PlayCommand')
		expect(getMockCall(commandReceiver0, 3, 1)._objectParams).toMatchObject({
			channel: 1,
			layer: 10,
			noClear: false,
			clip: 'AMB',
			loop: true,
			seek: 0,
		})
		expect(getMockCall(commandReceiver0, 4, 1).name).toEqual('ScheduleSetCommand')
		expect(getMockCall(commandReceiver0, 4, 1)._objectParams.timecode).toEqual('00:00:20:00')
		expect(getMockCall(commandReceiver0, 4, 1)._objectParams.command.name).toEqual('ClearCommand')
		expect(getMockCall(commandReceiver0, 4, 1)._objectParams.command._objectParams).toEqual({
			channel: 1,
			layer: 10,
		})
	})

	test('CasparCG: Play a filtered decklink in PAL for 60s', async () => {
		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		const myLayerMapping0: MappingCasparCG = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			channel: 2,
			layer: 42,
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init() // we cannot do an await, because setTimeout will never call without jest moving on.
		await myConductor.addDevice('myCCG', {
			type: DeviceType.CASPARCG,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1',
				useScheduling: true,
			},
		})
		await mockTime.advanceTimeToTicks(10100)

		expect(commandReceiver0).toHaveBeenCalledTimes(3)

		expect(getMockCall(commandReceiver0, 0, 1)._objectParams).toMatchObject({ channel: 1, timecode: '00:00:10:00' })
		expect(getMockCall(commandReceiver0, 1, 1)._objectParams).toMatchObject({ channel: 2, timecode: '00:00:10:00' })
		expect(getMockCall(commandReceiver0, 2, 1)._objectParams).toMatchObject({ channel: 3, timecode: '00:00:10:00' })

		commandReceiver0.mockClear()

		const deviceContainer = myConductor.getDevice('myCCG')
		const device = deviceContainer.device

		// Check that no commands has been scheduled:
		expect(await device['queue']).toHaveLength(0)

		myConductor.setTimelineAndMappings(
			[
				{
					id: 'obj0',
					enable: {
						start: mockTime.getCurrentTime() - 1000, // 1 seconds ago
						duration: 2000,
					},
					layer: 'myLayer0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.INPUT,

						device: 1,
						inputType: 'decklink',
						deviceFormat: ChannelFormat.HD_720P5000,
						filter: 'yadif=0:-1',
					},
				},
			] as TSRTimeline,
			myLayerMapping
		)

		await mockTime.advanceTimeToTicks(10200)

		// one command has been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 0, 1)._objectParams).toMatchObject({
			channel: 2,
			layer: 42,
			noClear: false,
			device: 1,
			filter: 'yadif=0:-1',
			format: ChannelFormat.HD_720P5000,
		})

		// advance time to end of clip:
		await mockTime.advanceTimeToTicks(11200)

		// two commands have been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 1, 1).name).toEqual('ScheduleSetCommand')
		expect(getMockCall(commandReceiver0, 1, 1)._objectParams.command.name).toEqual('ClearCommand')
		expect(getMockCall(commandReceiver0, 1, 1)._objectParams.command.channel).toEqual(2)
		expect(getMockCall(commandReceiver0, 1, 1)._objectParams.command.layer).toEqual(42)
	})

	test('CasparCG: play missing file with reloads', async () => {
		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		const myLayerMapping0: MappingCasparCG = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			channel: 2,
			layer: 42,
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init()
		await myConductor.addDevice('myCCG', {
			type: DeviceType.CASPARCG,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1',
				useScheduling: false,
				retryInterval: false, // disable retries explicitly, we will manually trigger them
			},
		})
		myConductor.setTimelineAndMappings([], myLayerMapping)
		await mockTime.advanceTimeToTicks(10100)

		expect(commandReceiver0).toHaveBeenCalledTimes(0)

		commandReceiver0.mockClear()

		const deviceContainer = myConductor.getDevice('myCCG')
		const device = deviceContainer.device

		// Check that no commands has been scheduled:
		expect(await device['queue']).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'obj0',
				enable: {
					start: mockTime.getCurrentTime() - 1000, // 1 seconds ago
					duration: 2000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.CASPARCG,
					type: TimelineContentTypeCasparCg.MEDIA,

					file: 'AMB',
					loop: true,
				},
			},
		])

		await mockTime.advanceTimeToTicks(10200)

		// one command has been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1)._objectParams).toMatchObject({
			channel: 2,
			layer: 42,
			noClear: false,
			clip: 'AMB',
			loop: true,
			seek: 0, // looping and seeking nos supported when length not provided
		})

		// advance before half way
		await mockTime.advanceTimeToTicks(10500)
		// no retries issued yet
		expect(commandReceiver0).toHaveBeenCalledTimes(1)

		// advance to half way
		await mockTime.advanceTimeToTicks(10700)
		// call the retry mechanism
		await (device as any)._assertIntendedState()
		await mockTime.advanceTimeToTicks(10800)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 1, 1)._objectParams).toMatchObject({
			channel: 2,
			layer: 42,
			noClear: false,
			clip: 'AMB',
			loop: true,
			seek: 0, // looping and seeking nos supported when length not provided
		})

		// apply command to internal ccg-state
		const currentState = await device.getState(mockTime.getCurrentTime())
		const resCommand = getMockCall(commandReceiver0, 1, 1)._objectParams
		if (currentState) {
			const currentCasparState = currentState.state

			const trackedState = await (await device._ccgState).getState()

			const channel = currentCasparState.channels[resCommand.channel]
			if (channel) {
				if (!trackedState.channels[resCommand.channel]) {
					trackedState.channels[resCommand.channel] = {
						channelNo: channel.channelNo,
						fps: channel.fps || 0,
						videoMode: channel.videoMode || null,
						layers: {},
					}
				}
				// Copy the tracked from current state:
				trackedState.channels[resCommand.channel].layers[resCommand.layer] = channel.layers[resCommand.layer]
				await (await device._ccgState).setState(trackedState)
			}
		}
		// trigger retry mechanism
		await (device as any)._assertIntendedState()
		await mockTime.advanceTimeToTicks(10900)
		// no retries done
		expect(commandReceiver0).toHaveBeenCalledTimes(2)

		// advance time to end of clip:
		await mockTime.advanceTimeToTicks(11200)

		// 3 commands have been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(3)
		expect(getMockCall(commandReceiver0, 2, 1).name).toEqual('ClearCommand')
		expect(getMockCall(commandReceiver0, 2, 1).channel).toEqual(2)
		expect(getMockCall(commandReceiver0, 2, 1).layer).toEqual(42)

		// advance time to after clip:
		await mockTime.advanceTimeToTicks(11700)
		// call the retry mechanism
		await (device as any)._assertIntendedState()
		await mockTime.advanceTimeToTicks(11800)
		// no retries issued
		expect(commandReceiver0).toHaveBeenCalledTimes(3)
	})

	test('CasparCG: play empty and expect no reloads', async () => {
		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		const myLayerMapping0: MappingCasparCG = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			channel: 2,
			layer: 42,
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		await myConductor.init()
		await myConductor.addDevice('myCCG', {
			type: DeviceType.CASPARCG,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1',
				useScheduling: false,
				retryInterval: false, // disable retries explicitly, we will manually trigger them
			},
		})
		myConductor.setTimelineAndMappings([], myLayerMapping)
		await mockTime.advanceTimeToTicks(10100)

		expect(commandReceiver0).toHaveBeenCalledTimes(0)

		commandReceiver0.mockClear()

		const deviceContainer = myConductor.getDevice('myCCG')
		const device = deviceContainer.device

		// Check that no commands has been scheduled:
		expect(await device['queue']).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'group0',
				enable: {
					while: 1,
				},
				layer: 'abstract',
				isGroup: true,
				content: {
					deviceType: DeviceType.ABSTRACT,
					type: 'empty',
				},
				children: [
					{
						id: 'obj0',
						enable: {
							start: 0, // always
						},
						layer: 'myLayer0',
						content: {
							deviceType: DeviceType.CASPARCG,
							type: TimelineContentTypeCasparCg.MEDIA,

							file: 'empty',
							transitions: {
								inTransition: {
									type: Transition.CUT,
									duration: 56 * 40,
								},
							},
						},
					},
				],
			},
		])

		await mockTime.advanceTimeToTicks(10200)

		// one command has been sent:
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1)._objectParams).toMatchObject({
			channel: 2,
			layer: 42,
			noClear: false,
			clip: 'empty',
			transition: 'CUT',
			transitionDirection: 'right',
			transitionEasing: 'linear',
			transitionDuration: 56,
			seek: 252, // 10100 / 40
		})

		// apply command to internal ccg-state
		const currentState = await device.getState(mockTime.getCurrentTime())
		const resCommand = getMockCall(commandReceiver0, 0, 1)._objectParams
		if (currentState) {
			const currentCasparState = currentState.state

			const trackedState = await (await device._ccgState).getState()

			const channel = currentCasparState.channels[resCommand.channel]
			if (channel) {
				if (!trackedState.channels[resCommand.channel]) {
					trackedState.channels[resCommand.channel] = {
						channelNo: channel.channelNo,
						fps: channel.fps || 0,
						videoMode: channel.videoMode || null,
						layers: {},
					}
				}
				// Copy the tracked from current state:
				trackedState.channels[resCommand.channel].layers[resCommand.layer] = channel.layers[resCommand.layer]
				await (await device._ccgState).setState(trackedState)
			}
		}

		// advance before half way
		await mockTime.advanceTimeToTicks(10500)
		// no retries issued yet
		expect(commandReceiver0).toHaveBeenCalledTimes(1)

		// advance to half way
		await mockTime.advanceTimeToTicks(10700)
		// call the retry mechanism
		await (device as any)._assertIntendedState()
		// still no retries as empty always plays
		expect(commandReceiver0).toHaveBeenCalledTimes(1)

		// note: no clear command is sent because the layer is already empty

		// advance time to after clip:
		await mockTime.advanceTimeToTicks(20700)
		// call the retry mechanism
		await (device as any)._assertIntendedState()
		await mockTime.advanceTimeToTicks(20800)
		// no retries issued
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
	})
})
