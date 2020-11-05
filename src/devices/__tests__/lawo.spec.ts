import { Conductor } from '../../conductor'
import { LawoDevice } from '../lawo'
import {
	Mappings,
	DeviceType,
	TimelineContentTypeLawo,
	MappingLawo,
	MappingLawoType,
	LawoDeviceMode,
} from '../../types/src'
import { MockTime } from '../../__tests__/mockTime'
import { ThreadedClass } from 'threadedclass'
import { getMockCall } from '../../__tests__/lib'

describe('Lawo', () => {
	const mockTime = new MockTime()

	beforeAll(() => {
		mockTime.mockDateNow()
	})
	beforeEach(() => {
		mockTime.init()
	})

	test('Lawo: Change volume', async () => {
		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		const myChannelMapping0: MappingLawo = {
			device: DeviceType.LAWO,
			deviceId: 'myLawo',
			mappingType: MappingLawoType.SOURCE,
			identifier: 'BASE',
		}
		const myRetriggerMapping: MappingLawo = {
			device: DeviceType.LAWO,
			deviceId: 'myLawo',
			mappingType: MappingLawoType.TRIGGER_VALUE,
		}
		const myChannelMapping: Mappings = {
			lawo_c1_fader: myChannelMapping0,
			lawo_trigger: myRetriggerMapping,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		myConductor.setTimelineAndMappings([], myChannelMapping)
		await myConductor.init() // we cannot do an await, because setTimeout will never call without jest moving on.
		await myConductor.addDevice('myLawo', {
			type: DeviceType.LAWO,
			options: {
				host: '160.67.96.51',
				port: 9000,
				commandReceiver: commandReceiver0,

				deviceMode: LawoDeviceMode.Ruby,
			},
		})
		await mockTime.advanceTimeToTicks(10100)

		const deviceContainer = myConductor.getDevice('myLawo')
		const device = deviceContainer.device as ThreadedClass<LawoDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)
		myConductor.setTimelineAndMappings([
			{
				id: 'obj0',
				enable: {
					start: mockTime.now - 1000, // 1 seconds in the past
					duration: 2000,
				},
				layer: 'lawo_c1_fader',
				content: {
					deviceType: DeviceType.LAWO,
					type: TimelineContentTypeLawo.SOURCE,

					'Fader/Motor dB Value': {
						value: -6,
					},
				},
			},
			{
				id: 'obj1',
				enable: {
					start: mockTime.now + 500, // 0.5 seconds in the future
					duration: 2000,
				},
				layer: 'lawo_c1_fader',
				content: {
					deviceType: DeviceType.LAWO,
					type: TimelineContentTypeLawo.SOURCE,

					'Fader/Motor dB Value': {
						value: -4,
						transitionDuration: 400,
						// triggerValue: string // only used for trigging new command sent
					},
				},
			},
			{
				id: 'obj2',
				enable: {
					start: mockTime.now + 1000, // 1 seconds in the future
					duration: 2000,
				},
				layer: 'lawo_c1_fader',
				content: {
					deviceType: DeviceType.LAWO,
					type: TimelineContentTypeLawo.SOURCE,

					'Fader/Motor dB Value': {
						value: -4,
						transitionDuration: 400,
						// triggerValue: string // only used for trigging new command sent
					},
				},
			},
			{
				id: 'obj3',
				enable: {
					start: mockTime.now + 2000, // 2 seconds in the future
					duration: 2000,
				},
				layer: 'lawo_trigger',
				content: {
					deviceType: DeviceType.LAWO,
					type: TimelineContentTypeLawo.TRIGGER_VALUE,

					triggerValue: 'asdf', // only used for trigging new command sent
				},
			},
		])
		await mockTime.advanceTimeToTicks(10200)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			// attribute: 'Motor dB Value',
			type: TimelineContentTypeLawo.SOURCE,
			value: -6,
			path: 'Ruby.Sources.BASE.Fader.Motor dB Value',
		})
		expect(getMockCall(commandReceiver0, 0, 2)).toBeTruthy()

		await mockTime.advanceTimeToTicks(11000)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 1, 1)).toMatchObject({
			// attribute: 'Motor dB Value',
			type: TimelineContentTypeLawo.SOURCE,
			value: -4,
			transitionDuration: 400,
			path: 'Ruby.Sources.BASE.Fader.Motor dB Value',
		})
		expect(getMockCall(commandReceiver0, 1, 2)).toBeTruthy() // context

		await mockTime.advanceTimeToTicks(11500)
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		// no new commands should have been sent, becuse obj2 is the same as obj1

		await mockTime.advanceTimeToTicks(12500)
		expect(commandReceiver0).toHaveBeenCalledTimes(3)
		expect(getMockCall(commandReceiver0, 2, 1)).toMatchObject({
			// attribute: 'Motor dB Value',
			type: TimelineContentTypeLawo.SOURCE,
			value: -4,
			path: 'Ruby.Sources.BASE.Fader.Motor dB Value',
		})
		expect(getMockCall(commandReceiver0, 2, 2)).toMatch(/triggerValue/i) // context
		await mockTime.advanceTimeToTicks(14500)
		expect(commandReceiver0).toHaveBeenCalledTimes(3)
		// no new commands should be sent, nothing is sent on object end
	})
	test('Lawo: Change volume on multiple faders', async () => {
		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		const myChannelMapping0: MappingLawo = {
			device: DeviceType.LAWO,
			deviceId: 'myLawo',
			mappingType: MappingLawoType.SOURCE,
			identifier: 'BASE',
		}
		const myChannelMapping1: MappingLawo = {
			device: DeviceType.LAWO,
			deviceId: 'myLawo',
			mappingType: MappingLawoType.SOURCE,
			identifier: 'BASE2',
		}
		const myChannelsMapping: MappingLawo = {
			device: DeviceType.LAWO,
			deviceId: 'myLawo',
			mappingType: MappingLawoType.SOURCES,
		}
		const myRetriggerMapping: MappingLawo = {
			device: DeviceType.LAWO,
			deviceId: 'myLawo',
			mappingType: MappingLawoType.TRIGGER_VALUE,
		}
		const myChannelMapping: Mappings = {
			lawo_c1_fader: myChannelMapping0,
			lawo_c2_fader: myChannelMapping1,
			lawo_base: myChannelsMapping,
			lawo_trigger: myRetriggerMapping,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		myConductor.setTimelineAndMappings([], myChannelMapping)
		await myConductor.init() // we cannot do an await, because setTimeout will never call without jest moving on.
		await myConductor.addDevice('myLawo', {
			type: DeviceType.LAWO,
			options: {
				host: '160.67.96.51',
				port: 9000,
				commandReceiver: commandReceiver0,

				deviceMode: LawoDeviceMode.Ruby,
			},
		})
		await mockTime.advanceTimeToTicks(10100)

		const deviceContainer = myConductor.getDevice('myLawo')
		const device = deviceContainer.device as ThreadedClass<LawoDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)
		myConductor.setTimelineAndMappings([
			{
				id: 'obj0',
				enable: {
					start: mockTime.now - 1000, // 1 seconds in the past
					duration: 2000,
				},
				layer: 'lawo_base',
				content: {
					deviceType: DeviceType.LAWO,
					type: TimelineContentTypeLawo.SOURCES,

					sources: [
						{
							mappingName: 'lawo_c1_fader',
							faderValue: -6,
						},
						{
							mappingName: 'lawo_c2_fader',
							faderValue: -6,
						},
					],
				},
			},
			{
				id: 'obj1',
				enable: {
					start: mockTime.now + 500, // 0.5 seconds in the future
					duration: 2000,
				},
				layer: 'lawo_base',
				content: {
					deviceType: DeviceType.LAWO,
					type: TimelineContentTypeLawo.SOURCES,

					sources: [
						{
							mappingName: 'lawo_c1_fader',
							faderValue: -4,
							transitionDuration: 400,
						},
						{
							mappingName: 'lawo_c2_fader',
							faderValue: -4,
							transitionDuration: 400,
						},
					],
				},
			},
			{
				id: 'obj2',
				enable: {
					start: mockTime.now + 1000, // 1 seconds in the future
					duration: 2000,
				},
				layer: 'lawo_base',
				content: {
					deviceType: DeviceType.LAWO,
					type: TimelineContentTypeLawo.SOURCES,

					sources: [
						{
							mappingName: 'lawo_c1_fader',
							faderValue: -4,
							transitionDuration: 400,
						},
						{
							mappingName: 'lawo_c2_fader',
							faderValue: -4,
							transitionDuration: 400,
						},
					],
				},
			},
			{
				id: 'obj3',
				enable: {
					start: mockTime.now + 2000, // 2 seconds in the future
					duration: 2000,
				},
				layer: 'lawo_trigger',
				content: {
					deviceType: DeviceType.LAWO,
					type: TimelineContentTypeLawo.TRIGGER_VALUE,

					triggerValue: 'asdf', // only used for trigging new command sent
				},
			},
		])

		await mockTime.advanceTimeToTicks(10200)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			// attribute: 'Motor dB Value',
			type: TimelineContentTypeLawo.SOURCE,
			value: -6,
			path: 'Ruby.Sources.BASE.Fader.Motor dB Value',
		})
		expect(getMockCall(commandReceiver0, 0, 2)).toBeTruthy()
		expect(getMockCall(commandReceiver0, 1, 1)).toMatchObject({
			// attribute: 'Motor dB Value',
			type: TimelineContentTypeLawo.SOURCE,
			value: -6,
			path: 'Ruby.Sources.BASE2.Fader.Motor dB Value',
		})
		expect(getMockCall(commandReceiver0, 1, 2)).toBeTruthy()

		await mockTime.advanceTimeToTicks(11000)

		expect(commandReceiver0).toHaveBeenCalledTimes(4)
		expect(getMockCall(commandReceiver0, 2, 1)).toMatchObject({
			// attribute: 'Motor dB Value',
			type: TimelineContentTypeLawo.SOURCE,
			value: -4,
			transitionDuration: 400,
			path: 'Ruby.Sources.BASE.Fader.Motor dB Value',
		})
		expect(getMockCall(commandReceiver0, 2, 2)).toBeTruthy() // context
		expect(getMockCall(commandReceiver0, 3, 1)).toMatchObject({
			// attribute: 'Motor dB Value',
			type: TimelineContentTypeLawo.SOURCE,
			value: -4,
			transitionDuration: 400,
			path: 'Ruby.Sources.BASE2.Fader.Motor dB Value',
		})
		expect(getMockCall(commandReceiver0, 3, 2)).toBeTruthy() // context

		await mockTime.advanceTimeToTicks(11500)
		expect(commandReceiver0).toHaveBeenCalledTimes(4)
		// no new commands should have been sent, becuse obj2 is the same as obj1

		await mockTime.advanceTimeToTicks(12500)
		expect(commandReceiver0).toHaveBeenCalledTimes(6)
		expect(getMockCall(commandReceiver0, 4, 1)).toMatchObject({
			// attribute: 'Motor dB Value',
			type: TimelineContentTypeLawo.SOURCE,
			value: -4,
			path: 'Ruby.Sources.BASE.Fader.Motor dB Value',
		})
		expect(getMockCall(commandReceiver0, 4, 2)).toMatch(/triggerValue/i) // context
		expect(getMockCall(commandReceiver0, 5, 1)).toMatchObject({
			// attribute: 'Motor dB Value',
			type: TimelineContentTypeLawo.SOURCE,
			value: -4,
			path: 'Ruby.Sources.BASE2.Fader.Motor dB Value',
		})
		expect(getMockCall(commandReceiver0, 5, 2)).toMatch(/triggerValue/i) // context
		await mockTime.advanceTimeToTicks(14500)
		expect(commandReceiver0).toHaveBeenCalledTimes(6)
		// no new commands should be sent, nothing is sent on object end
	})
	test('Lawo: Change volume on multiple faders with priorities', async () => {
		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		const myChannelMapping0: MappingLawo = {
			device: DeviceType.LAWO,
			deviceId: 'myLawo',
			mappingType: MappingLawoType.SOURCE,
			identifier: 'SOURCE1',
		}
		const myChannelMapping1: MappingLawo = {
			device: DeviceType.LAWO,
			deviceId: 'myLawo',
			mappingType: MappingLawoType.SOURCE,
			identifier: 'SOURCE2',
		}
		const myChannelsMapping: MappingLawo = {
			device: DeviceType.LAWO,
			deviceId: 'myLawo',
			mappingType: MappingLawoType.SOURCES,
		}
		const myRetriggerMapping: MappingLawo = {
			device: DeviceType.LAWO,
			deviceId: 'myLawo',
			mappingType: MappingLawoType.TRIGGER_VALUE,
		}
		const myChannelMapping: Mappings = {
			lawo_c1_fader: myChannelMapping0,
			lawo_c2_fader: myChannelMapping1,
			lawo_base: myChannelsMapping,
			lawo_trigger: myRetriggerMapping,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		myConductor.setTimelineAndMappings([], myChannelMapping)
		await myConductor.init() // we cannot do an await, because setTimeout will never call without jest moving on.
		await myConductor.addDevice('myLawo', {
			type: DeviceType.LAWO,
			options: {
				host: '160.67.96.51',
				port: 9000,
				commandReceiver: commandReceiver0,

				deviceMode: LawoDeviceMode.Ruby,
			},
		})
		await mockTime.advanceTimeToTicks(10100)

		const deviceContainer = myConductor.getDevice('myLawo')
		const device = deviceContainer.device as ThreadedClass<LawoDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)
		myConductor.setTimelineAndMappings([
			{
				id: 'obj0',
				enable: {
					start: mockTime.now - 1000, // 1 seconds in the past
					duration: 2000,
				},
				layer: 'lawo_base',
				content: {
					deviceType: DeviceType.LAWO,
					type: TimelineContentTypeLawo.SOURCES,

					sources: [
						{
							mappingName: 'lawo_c1_fader',
							faderValue: -6,
						},
						{
							mappingName: 'lawo_c2_fader',
							faderValue: -6,
						},
					],
				},
			},
			{
				id: 'obj1',
				enable: {
					start: mockTime.now - 1000, // 1 seconds in the past
					duration: 2000,
				},
				layer: 'lawo_c1_fader',
				content: {
					deviceType: DeviceType.LAWO,
					type: TimelineContentTypeLawo.SOURCE,

					faderValue: 0,
					overridePriority: 1,
				},
			},
			{
				id: 'obj2',
				enable: {
					start: mockTime.now + 500, // 0.5 seconds in the future
					duration: 2000,
				},
				layer: 'lawo_base',
				content: {
					deviceType: DeviceType.LAWO,
					type: TimelineContentTypeLawo.SOURCES,

					sources: [
						{
							mappingName: 'lawo_c1_fader',
							faderValue: -4,
							transitionDuration: 400,
						},
						{
							mappingName: 'lawo_c2_fader',
							faderValue: -4,
							transitionDuration: 400,
						},
					],
					overridePriority: 1,
				},
			},
			{
				id: 'obj3',
				enable: {
					start: mockTime.now + 500, // 0.5 seconds in the future
					duration: 2000,
				},
				layer: 'lawo_c1_fader',
				content: {
					deviceType: DeviceType.LAWO,
					type: TimelineContentTypeLawo.SOURCE,

					faderValue: -12,
					transitionDuration: 400,
				},
			},
		])

		await mockTime.advanceTimeToTicks(10200)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			// attribute: 'Motor dB Value',
			type: TimelineContentTypeLawo.SOURCE,
			value: 0,
			path: 'Ruby.Sources.SOURCE1.Fader.Motor dB Value',
		})
		expect(getMockCall(commandReceiver0, 0, 2)).toBeTruthy()
		expect(getMockCall(commandReceiver0, 1, 1)).toMatchObject({
			// attribute: 'Motor dB Value',
			type: TimelineContentTypeLawo.SOURCE,
			value: -6,
			path: 'Ruby.Sources.SOURCE2.Fader.Motor dB Value',
		})
		expect(getMockCall(commandReceiver0, 1, 2)).toBeTruthy()

		await mockTime.advanceTimeToTicks(11000)

		expect(commandReceiver0).toHaveBeenCalledTimes(4)
		expect(getMockCall(commandReceiver0, 2, 1)).toMatchObject({
			// attribute: 'Motor dB Value',
			type: TimelineContentTypeLawo.SOURCE,
			value: -4,
			transitionDuration: 400,
			path: 'Ruby.Sources.SOURCE1.Fader.Motor dB Value',
		})
		expect(getMockCall(commandReceiver0, 2, 2)).toBeTruthy() // context
		expect(getMockCall(commandReceiver0, 3, 1)).toMatchObject({
			// attribute: 'Motor dB Value',
			type: TimelineContentTypeLawo.SOURCE,
			value: -4,
			transitionDuration: 400,
			path: 'Ruby.Sources.SOURCE2.Fader.Motor dB Value',
		})
		expect(getMockCall(commandReceiver0, 3, 2)).toBeTruthy() // context

		await mockTime.advanceTimeToTicks(14500)
		expect(commandReceiver0).toHaveBeenCalledTimes(4)
		// no new commands should be sent, nothing is sent on object end
	})
	test('Lawo: Set delay om main/pgm', async () => {
		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		const lawoMainDelayOnMapping: MappingLawo = {
			device: DeviceType.LAWO,
			deviceId: 'myLawo',
			mappingType: MappingLawoType.FULL_PATH,
			identifier: '001.Sums.MAIN.DSP.Delay.On',
		}
		const lawoMainDelayTimeMapping: MappingLawo = {
			device: DeviceType.LAWO,
			deviceId: 'myLawo',
			mappingType: MappingLawoType.FULL_PATH,
			identifier: '001.Sums.MAIN.DSP.Delay.Time',
		}

		const myChannelMapping: Mappings = {
			lawo_delay_on: lawoMainDelayOnMapping,
			lawo_delay_time: lawoMainDelayTimeMapping,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		myConductor.setTimelineAndMappings([], myChannelMapping)
		await myConductor.init() // we cannot do an await, because setTimeout will never call without jest moving on.
		await myConductor.addDevice('myLawo', {
			type: DeviceType.LAWO,
			options: {
				host: '160.67.96.51',
				port: 9000,
				commandReceiver: commandReceiver0,

				deviceMode: LawoDeviceMode.Ruby,
			},
		})
		await mockTime.advanceTimeToTicks(10100)

		const deviceContainer = myConductor.getDevice('myLawo')
		const device = deviceContainer.device as ThreadedClass<LawoDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)
		myConductor.setTimelineAndMappings([
			{
				id: 'obj0',
				enable: {
					start: mockTime.now - 1000, // 0.5 seconds in the future
					duration: 2000,
				},
				layer: 'lawo_delay_on',
				content: {
					deviceType: DeviceType.LAWO,
					type: TimelineContentTypeLawo.EMBER_PROPERTY,
					value: true,
				},
			},
			{
				id: 'obj1',
				enable: {
					start: mockTime.now + 500, // 0.5 seconds in the future
					duration: 2000,
				},
				layer: 'lawo_delay_time',
				content: {
					deviceType: DeviceType.LAWO,
					type: TimelineContentTypeLawo.EMBER_PROPERTY,
					value: 80,
				},
			},
		])

		await mockTime.advanceTimeToTicks(10200)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			// attribute: 'Motor dB Value',
			type: TimelineContentTypeLawo.EMBER_PROPERTY,
			value: true,
			path: '001.Sums.MAIN.DSP.Delay.On',
		})
		expect(getMockCall(commandReceiver0, 0, 2)).toBeTruthy()

		await mockTime.advanceTimeToTicks(11000)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 1, 1)).toMatchObject({
			// attribute: 'Motor dB Value',
			type: TimelineContentTypeLawo.EMBER_PROPERTY,
			value: 80,
			path: '001.Sums.MAIN.DSP.Delay.Time',
		})
		expect(getMockCall(commandReceiver0, 1, 2)).toBeTruthy() // context

		await mockTime.advanceTimeToTicks(11500)
		expect(commandReceiver0).toHaveBeenCalledTimes(2)
	})
	test('Lawo: manual fade', async () => {
		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		const myChannelMapping0: MappingLawo = {
			device: DeviceType.LAWO,
			deviceId: 'myLawo',
			mappingType: MappingLawoType.SOURCE,
			identifier: 'RM1',
		}
		const myChannelMapping: Mappings = {
			lawo_c1_fader: myChannelMapping0,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		myConductor.on('error', (...args) => console.log(...args))
		myConductor.setTimelineAndMappings([], myChannelMapping)
		await myConductor.init() // we cannot do an await, because setTimeout will never call without jest moving on.
		await myConductor.addDevice('myLawo', {
			type: DeviceType.LAWO,
			options: {
				host: '160.67.96.51',
				port: 9000,
				setValueFn: commandReceiver0,

				deviceMode: LawoDeviceMode.R3lay,
				faderInterval: 40,
			},
		})
		await mockTime.advanceTimeToTicks(10100)

		const deviceContainer = myConductor.getDevice('myLawo')
		const device = deviceContainer.device as ThreadedClass<LawoDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)
		myConductor.setTimelineAndMappings([
			{
				id: 'obj0',
				enable: {
					start: mockTime.now - 1000, // 1 seconds in the past
					duration: 2000,
				},
				layer: 'lawo_c1_fader',
				content: {
					deviceType: DeviceType.LAWO,
					type: TimelineContentTypeLawo.SOURCE,

					'Fader/Motor dB Value': {
						value: -191,
						transitionDuration: 400,
					},
				},
			},
		])

		expect(await device.queue).toHaveLength(0)
		await mockTime.advanceTimeToTicks(10500)

		expect(commandReceiver0.mock.calls).toHaveLength(9)

		let last = 0
		for (let i = 0; i < 9; i++) {
			const mockCall = getMockCall(commandReceiver0, i, 0)
			expect(mockCall.value).toBeLessThan(last)
			expect(mockCall.value).toBeGreaterThanOrEqual(-191)
			last = mockCall.value
		}
	})
	test('Lawo: Command priority', async () => {
		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		const mapping0: MappingLawo = {
			device: DeviceType.LAWO,
			deviceId: 'myLawo',
			mappingType: MappingLawoType.FULL_PATH,
			identifier: 'MAIN.DSP0',
		}
		const mapping1: MappingLawo = {
			device: DeviceType.LAWO,
			deviceId: 'myLawo',
			mappingType: MappingLawoType.FULL_PATH,
			identifier: 'MAIN.DSP1',
			priority: 1,
		}
		const mapping2: MappingLawo = {
			device: DeviceType.LAWO,
			deviceId: 'myLawo',
			mappingType: MappingLawoType.FULL_PATH,
			identifier: 'MAIN.DSP2',
			priority: 3,
		}
		const mapping3: MappingLawo = {
			device: DeviceType.LAWO,
			deviceId: 'myLawo',
			mappingType: MappingLawoType.FULL_PATH,
			identifier: 'MAIN.DSP3',
			priority: 2,
		}
		const mapping4: MappingLawo = {
			device: DeviceType.LAWO,
			deviceId: 'myLawo',
			mappingType: MappingLawoType.FULL_PATH,
			identifier: 'MAIN.DSP4',
		}

		const myChannelMapping: Mappings = {
			mapping0: mapping0,
			mapping1: mapping1,
			mapping2: mapping2,
			mapping3: mapping3,
			mapping4: mapping4,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		myConductor.setTimelineAndMappings([], myChannelMapping)
		await myConductor.init() // we cannot do an await, because setTimeout will never call without jest moving on.
		await myConductor.addDevice('myLawo', {
			type: DeviceType.LAWO,
			options: {
				host: '160.67.96.51',
				port: 9000,
				commandReceiver: commandReceiver0,

				deviceMode: LawoDeviceMode.Ruby,
			},
		})
		await mockTime.advanceTimeToTicks(10100)

		const deviceContainer = myConductor.getDevice('myLawo')
		const device = deviceContainer.device as ThreadedClass<LawoDevice>

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)
		myConductor.setTimelineAndMappings([
			{
				id: 'obj0',
				enable: { start: mockTime.now - 1000 },
				layer: 'mapping0',
				content: {
					deviceType: DeviceType.LAWO,
					type: TimelineContentTypeLawo.SOURCE,
					'Fader/Motor dB Value': { value: 41 },
				},
			},
			{
				id: 'obj1',
				enable: { start: mockTime.now - 1000 },
				layer: 'mapping1',
				content: {
					deviceType: DeviceType.LAWO,
					type: TimelineContentTypeLawo.SOURCE,
					'Fader/Motor dB Value': { value: 41 },
				},
			},
			{
				id: 'obj2',
				enable: { start: mockTime.now - 1000 },
				layer: 'mapping2',
				content: {
					deviceType: DeviceType.LAWO,
					type: TimelineContentTypeLawo.SOURCE,
					'Fader/Motor dB Value': { value: 41 },
				},
			},
			{
				id: 'obj3',
				enable: { start: mockTime.now - 1000 },
				layer: 'mapping3',
				content: {
					deviceType: DeviceType.LAWO,
					type: TimelineContentTypeLawo.SOURCE,
					'Fader/Motor dB Value': { value: 41 },
				},
			},
			{
				id: 'obj4',
				enable: { start: mockTime.now - 1000 },
				layer: 'mapping4',
				content: {
					deviceType: DeviceType.LAWO,
					type: TimelineContentTypeLawo.SOURCE,
					'Fader/Motor dB Value': { value: 41 },
				},
			},
		])

		await mockTime.advanceTimeToTicks(10200)

		expect(commandReceiver0).toHaveBeenCalledTimes(5)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			type: TimelineContentTypeLawo.SOURCE,
			path: 'Ruby.Sources.MAIN.DSP2.Fader.Motor dB Value', // Highest priority
		})
		expect(getMockCall(commandReceiver0, 1, 1)).toMatchObject({
			type: TimelineContentTypeLawo.SOURCE,
			path: 'Ruby.Sources.MAIN.DSP3.Fader.Motor dB Value',
		})
		expect(getMockCall(commandReceiver0, 2, 1)).toMatchObject({
			type: TimelineContentTypeLawo.SOURCE,
			path: 'Ruby.Sources.MAIN.DSP1.Fader.Motor dB Value',
		})
		expect(getMockCall(commandReceiver0, 3, 1)).toMatchObject({
			type: TimelineContentTypeLawo.SOURCE,
			path: 'Ruby.Sources.MAIN.DSP0.Fader.Motor dB Value', // no prority, but sorted by path
		})
		expect(getMockCall(commandReceiver0, 4, 1)).toMatchObject({
			type: TimelineContentTypeLawo.SOURCE,
			path: 'Ruby.Sources.MAIN.DSP4.Fader.Motor dB Value',
		})
	})
})
