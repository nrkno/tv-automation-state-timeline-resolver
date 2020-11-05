import {
	MappingCasparCG,
	Mappings,
	DeviceType,
	TimelineContentTypeCasparCg,
	ChannelFormat,
	Transition,
} from '../types/src'
import { Conductor } from '../conductor'
import { MockTime } from './mockTime'
import { getMockCall } from './lib'

// let nowActual: number = Date.now()

describe('Rundown', () => {
	const mockTime = new MockTime()
	beforeAll(() => {
		mockTime.mockDateNow()
	})
	beforeEach(() => {
		mockTime.init()
	})

	test('Do a full rundown', async () => {
		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		let commandReceiver0Calls = 0
		const cam1Mapping: MappingCasparCG = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			channel: 3,
			layer: 10,
		}
		const cam2Mapping: MappingCasparCG = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			channel: 3,
			layer: 20,
		}
		const gfxMapping: MappingCasparCG = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			channel: 1,
			layer: 11,
		}
		const pgmMapping: MappingCasparCG = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			channel: 1,
			layer: 10,
		}
		const auxMapping: MappingCasparCG = {
			device: DeviceType.CASPARCG,
			deviceId: 'myCCG',
			channel: 2,
			layer: 10,
		}
		const myLayerMapping: Mappings = {
			cam1: cam1Mapping,
			cam2: cam2Mapping,
			gfx: gfxMapping,
			pgm: pgmMapping,
			aux1: auxMapping,
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
				retryInterval: false,
			},
		})
		await mockTime.advanceTimeToTicks(10001)

		const deviceContainer = myConductor.getDevice('myCCG')
		const device = deviceContainer.device

		// Check that no commands has been scheduled:
		expect(await device['queue']).toHaveLength(0)

		await mockTime.advanceTimeToTicks(10050)
		commandReceiver0Calls += 3
		expect(commandReceiver0).toHaveBeenCalledTimes(commandReceiver0Calls)
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 3, 1).name).toEqual('TimeCommand')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 2, 1).name).toEqual('TimeCommand')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 1, 1).name).toEqual('TimeCommand')

		// 00:00 - aux - bg_item1
		// 00:00 - gfx - short opener
		// 00:00 - pgm - cam 1

		// 00:03 - gfx - lt
		// 00:05 - pgm - stinger
		// 00:05 - aux - bg_item2
		// 00:08 - pgm - full opener
		myConductor.setTimelineAndMappings(
			[
				{
					id: 'cam1',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.INPUT,

						device: 3,
						inputType: 'decklink',
						deviceFormat: ChannelFormat.HD_720P5000,
					},
					enable: {
						start: 10000, // 00:10:00
						// duration: 0 // always on
					},
					layer: 'cam1',
				},
				{
					id: 'cam2',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.INPUT,

						device: 4,
						inputType: 'decklink',
						deviceFormat: ChannelFormat.HD_720P5000,
					},
					enable: {
						start: 10000, // 00:10:00
						// duration: 0, // always on
					},
					layer: 'cam2',
				},

				// rundown
				{
					id: 'bg_item1_0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'BG1',
						loop: true,
					},
					enable: {
						while: '.opener_item_1', // 00:10:00 - 00:15:25
						// duration: 10000,
					},
					layer: 'aux1',
				},
				{
					id: 'opener_clip_short',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'opener_short',
					},
					keyframes: [
						{
							id: 'kf1',
							enable: {
								start: '#opener_clip_short.end - 500',
								duration: 500,
							},
							content: {
								mixer: {
									opacity: 0,
									inTransition: {
										duration: 500,
									},
								},
							},
						},
					],
					enable: {
						start: 10000, // 00:10:00
						duration: 2000, // 00:12:00
					},
					layer: 'gfx',
				},
				{
					id: 'cam_opener_item_1',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.ROUTE,

						mappedLayer: 'cam1',
					},
					classes: ['opener_item_1'],
					enable: {
						start: '#opener_clip_short.start', // 00:10:00
						duration: 5500, // 00:15:25
					},
					layer: 'pgm',
				},
				{
					id: 'lt_opener',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.TEMPLATE,

						name: 'LT',
						data: {
							name: 'Presentator 123',
						},
						useStopCommand: true,
					},
					enable: {
						start: '#opener_clip_short.end + 1000', // 00:16:25
						duration: 1500, // 00:18:00
					},
					layer: 'gfx',
				},
				{
					id: 'stinger_opener_1_bg',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'stinger1',
					},
					enable: {
						start: '#cam_opener_item_1.end - 1000', // 00:14:25
						duration: 1000, // 00:16:25
					},
					layer: 'gfx',
					isLookahead: true,
				},
				{
					id: 'stinger_opener_1',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'stinger1',
					},
					enable: {
						start: '#cam_opener_item_1.end - 500', // 00:15:00
						duration: 1000, // 00:16:00
					},
					layer: 'gfx',
				},
				{
					id: 'cam_opener_item_2',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.ROUTE,

						mappedLayer: 'cam2',
					},
					classes: ['opener_item_2'],
					enable: {
						start: '#cam_opener_item_1.end', // 00:15:25
						duration: 2500, // 00:18:00
					},
					layer: 'pgm',
				},
				{
					id: 'bg_item2_0_bg',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'BG2',
						loop: true,
					},
					enable: {
						start: '#cam_opener_item_2.start', // 00:15:25
						duration: 1399, // 00:16:35?
					},
					layer: 'aux1',
					isLookahead: true,
				},
				{
					id: 'bg_item2_0',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'BG2',
						loop: true,
					},
					enable: {
						while: '.opener_item_2', // 00:15:25 - 00:18:00
						// duration: 10000,
					},
					layer: 'aux1',
				},
				{
					id: 'opener_full_bg',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'opener_full',

						transitions: {
							inTransition: {
								type: Transition.PUSH,
								duration: 250,
							},
						},
					},
					enable: {
						start: '#opener_full.start - 2000',
						duration: 2000,
					},
					layer: 'gfx',
					isLookahead: true,
				},
				{
					id: 'opener_full',
					content: {
						deviceType: DeviceType.CASPARCG,
						type: TimelineContentTypeCasparCg.MEDIA,

						file: 'opener_full',

						transitions: {
							inTransition: {
								type: Transition.PUSH,
								duration: 250,
							},
						},
					},
					enable: {
						start: '#cam_opener_item_2.end', // 00:16:44
						duration: 5000, // 00:21:44
					},
					layer: 'gfx',
				},
			],
			myLayerMapping
		)
		await mockTime.advanceTimeToTicks(10101)

		expect(mockTime.getCurrentTime()).toEqual(10101)

		// PLAY 1-10 ROUTE://3-10
		// PLAY 1-11 OPENER_SHORT
		// PLAY 2-10 BG1
		// PLAY 3-10 DECKLINK 3
		// PLAY 3-20 DECKLINK 4
		commandReceiver0Calls += 8
		expect(commandReceiver0).toHaveBeenCalledTimes(commandReceiver0Calls)
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 8, 1).name).toEqual('PlayRouteCommand')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 8, 1)._objectParams.command).toEqual(
			'PLAY 1-10 route://3-10'
		)

		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 7, 1).name).toEqual('PlayCommand')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 7, 1)._objectParams).toMatchObject({
			channel: 1,
			layer: 11,
			noClear: false,
			clip: 'opener_short',
			loop: false,
			seek: 1, // start at 10000 - 50 ms passed => seek 2
		})
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 6, 1).name).toEqual('PlayCommand')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 6, 1)._objectParams).toMatchObject({
			channel: 2,
			layer: 10,
			noClear: false,
			clip: 'BG1',
			loop: true,
			seek: 0,
		})
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 5, 1).name).toEqual('PlayDecklinkCommand')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 5, 1)._objectParams).toMatchObject({
			channel: 3,
			layer: 10,
			noClear: false,
			device: 3,
			format: ChannelFormat.HD_720P5000,
			channelLayout: undefined,
		})
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 4, 1).name).toEqual('PlayDecklinkCommand')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 4, 1)._objectParams).toMatchObject({
			channel: 3,
			layer: 20,
			noClear: false,
			device: 4,
			format: ChannelFormat.HD_720P5000,
			channelLayout: undefined,
		})

		// SCHEDULE SET 1.5s MIXER OPACITY 25
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 3, 1).name).toEqual('ScheduleSetCommand')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 3, 1)._objectParams.command.name).toEqual(
			'MixerOpacityCommand'
		)
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 3, 1)._objectParams.timecode).toEqual(
			'00:00:11:25'
		)
		expect(
			getMockCall(commandReceiver0, commandReceiver0Calls - 3, 1)._objectParams.command._objectParams
		).toMatchObject({
			channel: 1,
			layer: 11,
			transition: 'mix',
			transitionDuration: 12,
			transitionEasing: 'linear',
			transitionDirection: 'right',
			opacity: 0,
			keyword: 'OPACITY',
		})
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 2, 1).name).toEqual('ScheduleSetCommand')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 2, 1)._objectParams.timecode).toEqual(
			'00:00:12:00'
		)
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 2, 1)._objectParams.command.name).toEqual(
			'ClearCommand'
		)
		expect(
			getMockCall(commandReceiver0, commandReceiver0Calls - 2, 1)._objectParams.command._objectParams
		).toMatchObject({
			channel: 1,
			layer: 11,
		})
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 1, 1).name).toEqual('ScheduleSetCommand')
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 1, 1)._objectParams.timecode).toEqual(
			'00:00:12:00'
		)
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 1, 1)._objectParams.command.name).toEqual(
			'MixerClearCommand'
		)
		expect(
			getMockCall(commandReceiver0, commandReceiver0Calls - 1, 1)._objectParams.command._objectParams
		).toMatchObject({
			channel: 1,
			layer: 11,
		})

		await mockTime.advanceTimeToTicks(11101)
		expect(mockTime.getCurrentTime()).toEqual(11101)
		commandReceiver0Calls += 1
		expect(commandReceiver0).toHaveBeenCalledTimes(commandReceiver0Calls)
		// SCHEDULE SET 3s CG ADD 1-11 ...
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 1, 1)._objectParams.timecode).toEqual(
			'00:00:13:00'
		)
		expect(
			getMockCall(commandReceiver0, commandReceiver0Calls - 1, 1)._objectParams.command._objectParams
		).toMatchObject({
			channel: 1,
			layer: 11,
			noClear: false,
			templateName: 'LT',
			flashLayer: 1,
			playOnLoad: true,
			data: { name: 'Presentator 123' },
			cgStop: true,
			templateType: 'html',
		})

		await mockTime.advanceTimeToTicks(12601)
		expect(mockTime.getCurrentTime()).toEqual(12601)
		commandReceiver0Calls += 3

		expect(commandReceiver0).toHaveBeenCalledTimes(commandReceiver0Calls)
		// SCHEDULE SET 4.5s CG STOP
		// SCHEDULE SET 4.5s LOADBG 1-11 STINGER
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 3, 1)._objectParams.timecode).toEqual(
			'00:00:14:25'
		)
		expect(
			getMockCall(commandReceiver0, commandReceiver0Calls - 3, 1)._objectParams.command._objectParams
		).toMatchObject({
			channel: 1,
			layer: 11,
			flashLayer: 1,
		})
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 2, 1)._objectParams.timecode).toEqual(
			'00:00:14:25'
		)
		expect(
			getMockCall(commandReceiver0, commandReceiver0Calls - 2, 1)._objectParams.command._objectParams
		).toMatchObject({
			channel: 1,
			layer: 11, // gfx
			noClear: false,
			clip: 'stinger1',
			auto: false,
		})

		// await mockTime.advanceTimeToTicks(13000)
		// commandReceiver0Calls += 1
		// expect(commandReceiver0).toHaveBeenCalledTimes(commandReceiver0Calls)
		// SCHEDULE SET 5s PLAY 1-11
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 1, 1)._objectParams.timecode).toEqual(
			'00:00:15:00'
		)
		expect(
			getMockCall(commandReceiver0, commandReceiver0Calls - 1, 1)._objectParams.command._objectParams
		).toMatchObject({
			channel: 1,
			layer: 11, // gfx
			noClear: false,
		})

		await mockTime.advanceTimeToTicks(14000)
		expect(mockTime.getCurrentTime()).toEqual(14000)
		commandReceiver0Calls += 4

		expect(commandReceiver0).toHaveBeenCalledTimes(commandReceiver0Calls)
		// SCHEDULE SET 5.5s PLAY 2-10
		// SCHEDULE SET 5.5s PLAY 1-10 ROUTE://3-20
		// SCHEDULE SET 5s LOADBG 2-10 BG2
		// expect(getMockCall(commandReceiver0, 12, 1)._objectParams.command.name).toEqual('PlayCommand')

		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 4, 1)._objectParams.timecode).toEqual(
			'00:00:15:25'
		)
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 4, 1)._objectParams.command.name).toEqual(
			'PlayRouteCommand'
		)
		expect(
			getMockCall(commandReceiver0, commandReceiver0Calls - 4, 1)._objectParams.command._objectParams.command
		).toEqual('PLAY 1-10 route://3-20')

		// expect(getMockCall(commandReceiver0, commandReceiver0Calls - 4, 1)._objectParams.timecode).toEqual('00:00:15:25')
		// expect(getMockCall(commandReceiver0, commandReceiver0Calls - 4, 1)._objectParams.command.name).toEqual('PlayCommand')
		// expect(getMockCall(commandReceiver0, commandReceiver0Calls - 4, 1)._objectParams.command._objectParams).toMatchObject({
		// 	channel: 2,
		// 	layer: 10,
		// 	noClear: false
		// })

		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 3, 1)._objectParams.timecode).toEqual(
			'00:00:15:25'
		)
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 3, 1)._objectParams.command.name).toEqual(
			'PlayCommand'
		)
		expect(
			getMockCall(commandReceiver0, commandReceiver0Calls - 3, 1)._objectParams.command._objectParams
		).toMatchObject({
			channel: 2,
			layer: 10,
			noClear: false,
			clip: 'BG2',
			// auto: false
		})

		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 2, 1)._objectParams.timecode).toEqual(
			'00:00:16:00'
		)
		expect(
			getMockCall(commandReceiver0, commandReceiver0Calls - 2, 1)._objectParams.command._objectParams
		).toMatchObject({
			channel: 1,
			layer: 11,
		})
		// SCHEDULE SET 6s LOADBG 1-11 OPENER_FULL PUSH 13
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 1, 1)._objectParams.timecode).toEqual(
			'00:00:16:00'
		)
		expect(
			getMockCall(commandReceiver0, commandReceiver0Calls - 1, 1)._objectParams.command._objectParams
		).toMatchObject({
			channel: 1,
			layer: 11,
			noClear: false,
			clip: 'opener_full',
			auto: false,
			transition: 'PUSH',
			transitionDuration: 6,
			transitionEasing: 'linear',
			transitionDirection: 'right',
		})

		await mockTime.advanceTimeTicks(1000)
		expect(mockTime.getCurrentTime()).toEqual(15000)
		commandReceiver0Calls += 3
		expect(commandReceiver0).toHaveBeenCalledTimes(commandReceiver0Calls)

		// SCHEDULE SET 8s PLAY 1-11
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 3, 1)._objectParams.timecode).toEqual(
			'00:00:18:00'
		)
		expect(
			getMockCall(commandReceiver0, commandReceiver0Calls - 3, 1)._objectParams.command._objectParams
		).toMatchObject({
			channel: 1,
			layer: 11,
			noClear: false,
		})
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 2, 1)._objectParams.timecode).toEqual(
			'00:00:18:00'
		)
		expect(
			getMockCall(commandReceiver0, commandReceiver0Calls - 2, 1)._objectParams.command._objectParams
		).toMatchObject({
			channel: 1,
			layer: 10,
		})
		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 1, 1)._objectParams.timecode).toEqual(
			'00:00:18:00'
		)
		expect(
			getMockCall(commandReceiver0, commandReceiver0Calls - 1, 1)._objectParams.command._objectParams
		).toMatchObject({
			channel: 2,
			layer: 10,
		})

		await mockTime.advanceTimeToTicks(22000)
		expect(mockTime.getCurrentTime()).toEqual(22000)
		commandReceiver0Calls += 1

		expect(commandReceiver0).toHaveBeenCalledTimes(commandReceiver0Calls)

		expect(getMockCall(commandReceiver0, commandReceiver0Calls - 1, 1)._objectParams.timecode).toEqual(
			'00:00:23:00'
		)
		expect(
			getMockCall(commandReceiver0, commandReceiver0Calls - 1, 1)._objectParams.command._objectParams
		).toMatchObject({
			channel: 1,
			layer: 11,
		})
	})
})
