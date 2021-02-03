import {
	Mappings,
	MappingAbstract,
	DeviceType,
	TSRTimelineObj,
	TSRTimeline,
	LawoDeviceMode,
	MappingCasparCG,
	TimelineContentTypeCasparCg
} from '../types/src'
import { Conductor, TimelineTriggerTimeResult } from '../conductor'
import * as _ from 'underscore'
import { MockTime } from './mockTime'
import { ThreadedClass } from 'threadedclass'
import { AbstractDevice } from '../devices/abstract'
import { getMockCall } from './lib'
import { setupAllMocks } from '../__mocks__/_setup-all-mocks'

describe('Conductor', () => {
	let mockTime = new MockTime()
	beforeAll(() => {
		setupAllMocks()
		mockTime.mockDateNow()
	})
	beforeEach(() => {
		mockTime.init()
	})
	test('Test Abstract-device functionality', async () => {

		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})
		const commandReceiver1: any = jest.fn(() => {
			return Promise.resolve()
		})

		let myLayerMapping0: MappingAbstract = {
			device: DeviceType.ABSTRACT,
			deviceId: 'device0'
		}
		let myLayerMapping1: MappingAbstract = {
			device: DeviceType.ABSTRACT,
			deviceId: 'device1'
		}
		let myLayerMapping: Mappings = {
			'myLayer0': myLayerMapping0,
			'myLayer1': myLayerMapping1
		}

		let conductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime
		})

		await conductor.init()
		await conductor.addDevice('device0', {
			type: DeviceType.ABSTRACT,
			options: {
				commandReceiver: commandReceiver0
			}
		})
		await conductor.addDevice('device1', {
			type: DeviceType.ABSTRACT,
			options: {
				commandReceiver: commandReceiver1
			}
		})

		// add something that will play in a seconds time
		let abstractThing0: TSRTimelineObj = {
			id: 'a0',
			enable: {
				start: mockTime.now,
				duration: 1000
			},
			layer: 'myLayer0',
			content: {
				deviceType: DeviceType.ABSTRACT,
				myAttr1: 'one',
				myAttr2: 'two'
			}
		}
		let abstractThing1: TSRTimelineObj = {
			id: 'a1',
			enable: {
				start: mockTime.now + 1000,
				duration: 1000
			},
			layer: 'myLayer1',
			content: {
				deviceType: DeviceType.ABSTRACT,
				myAttr1: 'three',
				myAttr2: 'four'
			}
		}

		let device0Container = conductor.getDevice('device0')
		let device0 = device0Container.device
		let device1Container = conductor.getDevice('device1')
		let device1 = device1Container.device

		// The queues should be empty
		expect(await device0['queue']).toHaveLength(0)
		expect(await device1['queue']).toHaveLength(0)

		conductor.setTimelineAndMappings([abstractThing0, abstractThing1], myLayerMapping)

		// there should now be one command queued:
		await mockTime.tick()
		expect(await device0['queue']).toHaveLength(1)
		expect(await device1['queue']).toHaveLength(0)

		// Move forward in time
		await mockTime.advanceTimeTicks(500) // to time 10500

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 0)).toEqual(10000)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			commandName: 'addedAbstract',
			content: {
				deviceType: 0, // abstract
				myAttr1: 'one',
				myAttr2: 'two'
			}

		})
		expect(getMockCall(commandReceiver0, 0, 2)).toEqual('added: a0') // context
		expect(commandReceiver1).toHaveBeenCalledTimes(0)

		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(11500)

		// expect(device0['queue']).toHaveLength(0)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 0)).toEqual(11000)
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			commandName: 'removedAbstract',
			content: {
				deviceType: 0, // abstract
				myAttr1: 'one',
				myAttr2: 'two'
			}
		})
		expect(getMockCall(commandReceiver0, 0, 2)).toEqual('removed: a0') // context
		expect(commandReceiver1).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver1, 0, 0)).toEqual(11000)
		expect(getMockCall(commandReceiver1, 0, 1)).toMatchObject({
			commandName: 'addedAbstract',
			content: {
				deviceType: 0, // abstract
				myAttr1: 'three',
				myAttr2: 'four'
			}
		})

		commandReceiver0.mockClear()
		commandReceiver1.mockClear()
		await mockTime.advanceTimeTicks(3000)

		expect(commandReceiver0).toHaveBeenCalledTimes(0)
		expect(commandReceiver1).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver1, 0, 0)).toEqual(12000)
		expect(getMockCall(commandReceiver1, 0, 1)).toMatchObject({
			commandName: 'removedAbstract',
			content: {
				deviceType: 0, // abstract
				myAttr1: 'three',
				myAttr2: 'four'
			}
		})
		expect(getMockCall(commandReceiver1, 0, 2)).toEqual('removed: a1') // context

		await conductor.removeDevice('device1')
		expect(conductor.getDevice('device1')).toBeFalsy()

		await conductor.addDevice(
			'device1',
			{ type: DeviceType.ABSTRACT, options: { commandReceiver: commandReceiver1 } }
		).then((res) => {
			expect(res).toBeTruthy()
		})

		// @ts-ignore
		abstractThing0.enable.start = mockTime.now
		conductor.setTimelineAndMappings([ abstractThing0 ], {
			'myLayer0': myLayerMapping1,
			'myLayer1': myLayerMapping0
		})
		if (_.isArray(abstractThing0.enable)) throw new Error('.enable should not be an array')
		abstractThing0.enable.start = mockTime.now
		conductor.setTimelineAndMappings([ abstractThing0 ])
	})

	test('Test the "Now" and "Callback-functionality', async () => {

		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})

		let myLayerMapping0: MappingAbstract = {
			device: DeviceType.ABSTRACT,
			deviceId: 'device0'
		}
		let myLayerMapping: Mappings = {
			'myLayer0': myLayerMapping0
		}

		let conductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime
		})

		await conductor.init()
		await conductor.addDevice('device0', {
			type: DeviceType.ABSTRACT,
			options: {
				commandReceiver: commandReceiver0
			}
		})

		// add something that will play "now"
		let abstractThing0: TSRTimelineObj = { // will be converted from "now" to 10000
			id: 'a0',
			enable: {
				start: 'now', // 10000
				duration: 5000 // 15000
			},
			layer: 'myLayer0',
			content: {
				deviceType: DeviceType.ABSTRACT,
				myAttr1: 'one',
				myAttr2: 'two'
			}
		}
		let abstractThing1: TSRTimelineObj = { // will cause a callback to be sent
			id: 'a1',
			enable: {
				start: '#a0.start + 300', // 10300
				duration: 5000 // 15300
			},
			layer: 'myLayer0',
			content: {
				deviceType: DeviceType.ABSTRACT,
				myAttr1: 'one',
				myAttr2: 'two',
				callBack: 'abc',
				callBackData: {
					hello: 'dude'
				},
				callBackStopped: 'abcStopped'
			}
		}
		let timeline: TSRTimeline = [abstractThing0, abstractThing1]

		let setTimelineTriggerTime = jest.fn((results: TimelineTriggerTimeResult) => {
			_.each(results, (trigger) => {
				let o = _.findWhere(timeline, { id: trigger.id })
				if (o) {
					if (_.isArray(o.enable)) throw new Error('.enable should not be an array')
					o.enable.start = trigger.time
				}
			})
			// update the timeline:
			conductor.setTimelineAndMappings(timeline, myLayerMapping)
		})
		conductor.on('setTimelineTriggerTime', setTimelineTriggerTime)

		let timelineCallback = jest.fn()
		conductor.on('timelineCallback', timelineCallback)

		let device0Container = conductor.getDevice('device0')
		let device0 = device0Container.device as ThreadedClass<AbstractDevice>
		expect(device0).toBeTruthy()
		// let device1 = conductor.getDevice('device1')

		// The queues should be empty
		expect(await device0.queue).toHaveLength(0)
		// expect(device1['queue']).toHaveLength(0)

		expect(setTimelineTriggerTime).toHaveBeenCalledTimes(0)

		conductor.setTimelineAndMappings(timeline)

		// there should now be commands queued:
		await mockTime.tick()

		// const q = await device0.queue
		// expect(q).toHaveLength(2)
		// expect(q[0].time).toEqual(10000)
		// expect(q[1].time).toEqual(10300)

		// the setTimelineTriggerTime event should have been emitted:
		expect(setTimelineTriggerTime).toHaveBeenCalledTimes(1)
		expect(getMockCall(setTimelineTriggerTime, 0, 0)[0].time).toEqual(10000)

		// the timelineCallback event should have been emitted:
		expect(timelineCallback).toHaveBeenCalledTimes(0)

		// Move forward in time
		await mockTime.advanceTimeToTicks(10100)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(timelineCallback).toHaveBeenCalledTimes(0)

		await mockTime.advanceTimeToTicks(10500)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(timelineCallback).toHaveBeenCalledTimes(1)
		expect(getMockCall(timelineCallback, 0, 0)).toEqual(10300)
		expect(getMockCall(timelineCallback, 0, 1)).toEqual('a1')
		expect(getMockCall(timelineCallback, 0, 2)).toEqual('abc')
		expect(getMockCall(timelineCallback, 0, 3)).toEqual({ hello: 'dude' })

		await mockTime.advanceTimeToTicks(15500)

		// expect(commandReceiver0).toHaveBeenCalledTimes(3)
		expect(commandReceiver0.mock.calls).toHaveLength(3)
	})

	test('devicesMakeReady', async () => {
		const commandReceiver0 = jest.fn(() => {
			return Promise.resolve()
		})
		const commandReceiver1 = jest.fn(() => {
			return Promise.resolve()
		})
		const commandReceiver2 = jest.fn(() => {
			return Promise.resolve()
		})
		const commandReceiver3 = jest.fn(() => {
			return Promise.resolve()
		})
		const commandReceiver4 = jest.fn(() => {
			return Promise.resolve()
		})
		let conductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime
		})

		await conductor.init()
		await conductor.addDevice('device0', {
			type: DeviceType.ABSTRACT,
			options: {
				commandReceiver: commandReceiver0
			}
		})
		await conductor.addDevice('device1', {
			type: DeviceType.CASPARCG,
			options: {
				commandReceiver: commandReceiver1,
				host: '127.0.0.1'
			}
		})
		await conductor.addDevice('device2', {
			type: DeviceType.ATEM,
			options: {
				commandReceiver: commandReceiver2,
				host: '127.0.0.1'
			}
		})
		await conductor.addDevice('device3', {
			type: DeviceType.HTTPSEND,
			options: {
				commandReceiver: commandReceiver3
			}
		})
		await conductor.addDevice('device4', {
			type: DeviceType.LAWO,
			options: {
				commandReceiver: commandReceiver4,

				deviceMode: LawoDeviceMode.Ruby
			}
		})

		await conductor.devicesMakeReady(true)

		await mockTime.advanceTimeTicks(10) // to allow for commands to be sent

		// expect(commandReceiver1).toHaveBeenCalledTimes(3)
		expect(commandReceiver1.mock.calls).toHaveLength(3)
		// expect(getMockCall(commandReceiver1, 0, 1).name).toEqual('TimeCommand')
		// expect(getMockCall(commandReceiver1, 0, 1)._objectParams).toMatchObject({
		// 	channel: 1,
		// 	timecode: '00:00:10:00'
		// })
		// expect(getMockCall(commandReceiver1, 1, 1).name).toEqual('TimeCommand')
		// expect(getMockCall(commandReceiver1, 1, 1)._objectParams).toMatchObject({
		// 	channel: 2,
		// 	timecode: '00:00:10:00'
		// })
		// expect(getMockCall(commandReceiver1, 2, 1).name).toEqual('TimeCommand')
		// expect(getMockCall(commandReceiver1, 2, 1)._objectParams).toMatchObject({
		// 	channel: 3,
		// 	timecode: '00:00:10:00'
		// })

		expect(getMockCall(commandReceiver1, 0, 1).name).toEqual('ClearCommand')
		expect(getMockCall(commandReceiver1, 0, 1)._objectParams).toMatchObject({
			channel: 1
		})
		expect(getMockCall(commandReceiver1, 1, 1).name).toEqual('ClearCommand')
		expect(getMockCall(commandReceiver1, 1, 1)._objectParams).toMatchObject({
			channel: 2
		})
		expect(getMockCall(commandReceiver1, 2, 1).name).toEqual('ClearCommand')
		expect(getMockCall(commandReceiver1, 2, 1)._objectParams).toMatchObject({
			channel: 3
		})
	})

	test('Construction of multithreaded device', async () => {
		const myLayerMapping0: MappingAbstract = {
			device: DeviceType.ABSTRACT,
			deviceId: 'device0'
		}
		const myLayerMapping: Mappings = {
			'myLayer0': myLayerMapping0
		}

		const conductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime
		})
		conductor.on('error', console.error)

		await conductor.init()
		await conductor.addDevice('device0', {
			type: DeviceType.ABSTRACT,
			options: {},
			isMultiThreaded: true
		})
		conductor.setTimelineAndMappings([], myLayerMapping)

		const device = conductor.getDevice('device0').device
		expect(await device.getCurrentTime()).toBeTruthy()
	}, 1500)
	test('Changing of mappings live', async () => {
		const commandReceiver0: any = jest.fn(() => {
			return Promise.resolve()
		})

		let myLayerMapping0: MappingCasparCG = {
			device: DeviceType.CASPARCG,
			deviceId: 'device0',
			channel: 1,
			layer: 10
		}
		let myLayerMapping: Mappings = {
			'myLayer0': myLayerMapping0
		}

		let conductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime
		})

		await conductor.init()
		await conductor.addDevice('device0', {
			type: DeviceType.CASPARCG,
			options: {
				commandReceiver: commandReceiver0,
				host: '127.0.0.1'
			}
		})
		conductor.setTimelineAndMappings([], myLayerMapping)

		await mockTime.advanceTimeTicks(10) // just a little bit

		// add something that will play "now"
		let video0: TSRTimelineObj = { // will be converted from "now" to 10000
			id: 'a0',
			enable: {
				start: 'now', // 10000
				duration: 10000 // 20000
			},
			layer: 'myLayer0',
			content: {
				deviceType: DeviceType.CASPARCG,
				type: TimelineContentTypeCasparCg.MEDIA,

				file: 'AMB'
			}
		}

		let timeline: TSRTimeline = [video0]

		let device0Container = conductor.getDevice('device0')
		let device0 = device0Container.device as ThreadedClass<AbstractDevice>
		expect(device0).toBeTruthy()

		// The queues should be empty
		expect(await device0.queue).toHaveLength(0)

		conductor.setTimelineAndMappings(timeline)

		// there should now be commands queued:
		// await mockTime.tick()

		await mockTime.advanceTimeToTicks(10500)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(getMockCall(commandReceiver0, 0, 1).name).toEqual('PlayCommand')
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			_objectParams: {
				clip: 'AMB',
				channel: 1,
				layer: 10
			}
		})

		commandReceiver0.mockClear()

		// modify the mapping:
		myLayerMapping0.layer = 20
		conductor.setTimelineAndMappings(timeline, myLayerMapping)

		await mockTime.advanceTimeTicks(100) // just a little bit

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(getMockCall(commandReceiver0, 0, 1).name).toEqual('ClearCommand')
		expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
			_objectParams: {
				// clip: 'AMB',
				channel: 1,
				layer: 10
			}
		})
		expect(getMockCall(commandReceiver0, 1, 1).name).toEqual('PlayCommand')
		expect(getMockCall(commandReceiver0, 1, 1)).toMatchObject({
			_objectParams: {
				clip: 'AMB',
				channel: 1,
				layer: 20
			}
		})

		commandReceiver0.mockClear()

		// Replace the mapping altogether:
		delete myLayerMapping['myLayer0']
		let myLayerMappingNew: MappingCasparCG = {
			device: DeviceType.CASPARCG,
			deviceId: 'device0',
			channel: 2,
			layer: 10
		}
		myLayerMapping['myLayerNew'] = myLayerMappingNew
		video0.layer = 'myLayerNew'
		conductor.setTimelineAndMappings(timeline, myLayerMapping)

		await mockTime.advanceTimeTicks(100) // just a little bit

		const nææh = false
		const DO_IT_RIGHT = nææh
		if (DO_IT_RIGHT) {
			// Note: We only expect a play command on the new channel,
			// The old channel now has no mapping, and should be left alone
			expect(commandReceiver0).toHaveBeenCalledTimes(1)
			expect(getMockCall(commandReceiver0, 0, 1).name).toEqual('PlayCommand')
			expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
				_objectParams: {
					clip: 'AMB',
					channel: 2,
					layer: 10
				}
			})
		} else {
			expect(commandReceiver0).toHaveBeenCalledTimes(2)
			expect(getMockCall(commandReceiver0, 0, 1).name).toEqual('ClearCommand')
			expect(getMockCall(commandReceiver0, 0, 1)).toMatchObject({
				_objectParams: {
					channel: 1,
					layer: 20
				}
			})

			expect(getMockCall(commandReceiver0, 1, 1).name).toEqual('PlayCommand')
			expect(getMockCall(commandReceiver0, 1, 1)).toMatchObject({
				_objectParams: {
					clip: 'AMB',
					channel: 2,
					layer: 10
				}
			})

		}
	})
})
