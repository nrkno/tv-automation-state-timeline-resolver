import { setupQuantelGatewayMock } from './quantelGatewayMock'
import { Conductor } from '../../conductor'
import { Mappings, DeviceType, MappingQuantel, QuantelTransitionType } from '../../types/src'
import { MockTime } from '../../__tests__/mockTime'
import { ThreadedClass } from 'threadedclass'
import { QuantelDevice, QuantelCommandType } from '../quantel'
import '../../__tests__/lib'

const orgSetTimeout = setTimeout

async function t<A>(p: Promise<A>, mockTime: MockTime, advanceTime = 50): Promise<A> {
	orgSetTimeout(() => {
		mockTime.advanceTimeTicks(advanceTime)
	}, 1)
	return p
}

/** Accepted deviance, accepted deviance in command timing during testing */
const ADEV = 30

describe('Quantel', () => {
	const { quantelServer, onRequest } = setupQuantelGatewayMock()

	function clearMocks() {
		onRequest.mockClear()
	}

	const mockTime = new MockTime()
	beforeAll(() => {
		mockTime.mockDateNow()
	})
	beforeEach(() => {
		mockTime.init()

		clearMocks()
		quantelServer.ignoreConnectivityCheck = false
		quantelServer.port = {}
	})
	test('Play and stop', async () => {
		let device: any = undefined
		const commandReceiver0: any = jest.fn((...args) => {
			// pipe through the command
			return device._defaultCommandReceiver(...args)
		})

		const myLayerMapping0: MappingQuantel = {
			device: DeviceType.QUANTEL,
			deviceId: 'myQuantel',

			portId: 'my_port',
			channelId: 2,
			// keyChannelID: number
			// mode?: QuantelControlMode
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		const errorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		myConductor.on('error', errorHandler)
		myConductor.on('commandError', errorHandler)
		await myConductor.init()

		await t(
			myConductor.addDevice('myQuantel', {
				type: DeviceType.QUANTEL,
				options: {
					commandReceiver: commandReceiver0,
					// host: '127.0.0.1'

					gatewayUrl: 'localhost:3000',
					ISAUrlMaster: 'myISA:8000',
					zoneId: undefined, // fallback to 'default'
					serverId: 1100,
				},
			}),
			mockTime
		)

		const deviceContainer = myConductor.getDevice('myQuantel')
		device = deviceContainer.device as ThreadedClass<QuantelDevice>
		const deviceErrorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		device.on('error', deviceErrorHandler)
		device.on('commandError', deviceErrorHandler)

		myConductor.setTimelineAndMappings([], myLayerMapping)

		expect(mockTime.getCurrentTime()).toEqual(10000)
		await mockTime.advanceTimeToTicks(10100)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			expect.toBeCloseTo(10000, ADEV),
			expect.objectContaining({
				type: QuantelCommandType.SETUPPORT,
				time: 10005, // Because it was so close to currentTime, otherwise 9000
			}),
			expect.any(String),
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			expect.toBeCloseTo(10000, ADEV),
			expect.objectContaining({
				type: QuantelCommandType.CLEARCLIP,
				time: 10005,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(6)

		// Connect to ISA
		expect(onRequest).toHaveBeenNthCalledWith(1, 'post', 'http://localhost:3000/connect/myISA%3A8000')
		// get initial server info
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', 'http://localhost:3000/default/server')

		// Set up port:
		// get server info
		expect(onRequest).toHaveBeenNthCalledWith(3, 'get', 'http://localhost:3000/default/server')
		// get port info
		expect(onRequest).toHaveBeenNthCalledWith(4, 'get', 'http://localhost:3000/default/server/1100/port/my_port')
		// create new port and assign to channel
		expect(onRequest).toHaveBeenNthCalledWith(
			5,
			'put',
			'http://localhost:3000/default/server/1100/port/my_port/channel/2'
		)
		// Reset the port
		expect(onRequest).toHaveBeenNthCalledWith(
			6,
			'post',
			'http://localhost:3000/default/server/1100/port/my_port/reset'
		)

		clearMocks()
		commandReceiver0.mockClear()

		quantelServer.ignoreConnectivityCheck = true

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'video0',
				enable: {
					start: 11000,
					duration: 5000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.QUANTEL,

					title: 'myClip0',

					// seek?: number
					// inPoint?: number
					// length?: number
					// pauseTime?: number
					// playing?: boolean
					// noStarttime?: boolean
				},
			},
		])
		// Time to preload the clip
		await mockTime.advanceTimeToTicks(10990)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			10155,
			expect.objectContaining({
				type: QuantelCommandType.LOADCLIPFRAGMENTS,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(6)

		// Search for and get clip info:
		expect(onRequest).toHaveBeenNthCalledWith(
			1,
			'get',
			expect.stringContaining('/default/clip?Title=%22myClip0%22')
		)
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('/default/clip/1337'))
		// Fetch fragments:
		expect(onRequest).toHaveBeenNthCalledWith(3, 'get', expect.stringContaining('clip/1337/fragments'))
		// get port info
		expect(onRequest).toHaveBeenNthCalledWith(4, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Load fragments
		expect(onRequest).toHaveBeenNthCalledWith(5, 'post', expect.stringContaining('port/my_port/fragments'))
		// Prepare jump:
		expect(onRequest).toHaveBeenNthCalledWith(6, 'put', expect.stringContaining('port/my_port/jump?offset='))

		clearMocks()
		commandReceiver0.mockClear()

		// Time to start playing
		await mockTime.advanceTimeToTicks(11300)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			11000,
			expect.objectContaining({
				type: QuantelCommandType.PLAYCLIP,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(3)

		// Trigger Jump
		// expect(onRequest).toHaveBeenNthCalledWith(1, 'post', expect.stringContaining('/default/server/1100/port/my_port/trigger/JUMP'))
		// Trigger play
		expect(onRequest).toHaveBeenNthCalledWith(
			1,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/START')
		)
		// Check that play worked
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Plan to stop at end of clip
		expect(onRequest).toHaveBeenNthCalledWith(
			3,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/STOP?offset=1999')
		)

		clearMocks()
		commandReceiver0.mockClear()

		// Time to stop playing
		await mockTime.advanceTimeToTicks(16050)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			16000,
			expect.objectContaining({
				type: QuantelCommandType.CLEARCLIP,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(1)
		// Clear port from clip (reset port)
		expect(onRequest).toHaveBeenNthCalledWith(1, 'post', expect.stringContaining('port/my_port/reset'))

		await myConductor.destroy()

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})
	test('Play and stop, using clip guid', async () => {
		let device: any = undefined
		const commandReceiver0: any = jest.fn((...args) => {
			// pipe through the command
			return device._defaultCommandReceiver(...args)
		})

		const myLayerMapping0: MappingQuantel = {
			device: DeviceType.QUANTEL,
			deviceId: 'myQuantel',

			portId: 'my_port',
			channelId: 2,
			// keyChannelID: number
			// mode?: QuantelControlMode
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		const errorHandler = jest.fn()
		myConductor.on('error', errorHandler)

		await myConductor.init()

		await t(
			myConductor.addDevice('myQuantel', {
				type: DeviceType.QUANTEL,
				options: {
					commandReceiver: commandReceiver0,
					// host: '127.0.0.1'

					gatewayUrl: 'localhost:3000',
					ISAUrlMaster: 'myISA:8000',
					zoneId: undefined, // fallback to 'default'
					serverId: 1100,
				},
			}),
			mockTime
		)

		const deviceContainer = myConductor.getDevice('myQuantel')
		device = deviceContainer.device as ThreadedClass<QuantelDevice>
		const deviceErrorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		device.on('error', deviceErrorHandler)
		device.on('commandError', deviceErrorHandler)

		myConductor.setTimelineAndMappings([], myLayerMapping)
		expect(mockTime.getCurrentTime()).toEqual(10000)
		await mockTime.advanceTimeToTicks(10100)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			expect.toBeCloseTo(10000, ADEV),
			expect.objectContaining({
				type: QuantelCommandType.SETUPPORT,
				time: 10005, // Because it was so close to currentTime, otherwise 9000
			}),
			expect.any(String),
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			expect.toBeCloseTo(10000, ADEV),
			expect.objectContaining({
				type: QuantelCommandType.CLEARCLIP,
				time: 10005,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(6)

		// Connect to ISA
		expect(onRequest).toHaveBeenNthCalledWith(1, 'post', 'http://localhost:3000/connect/myISA%3A8000')
		// get initial server info
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', 'http://localhost:3000/default/server')

		// Set up port:
		// get server info
		expect(onRequest).toHaveBeenNthCalledWith(3, 'get', 'http://localhost:3000/default/server')
		// get port info
		expect(onRequest).toHaveBeenNthCalledWith(4, 'get', 'http://localhost:3000/default/server/1100/port/my_port')
		// create new port and assign to channel
		expect(onRequest).toHaveBeenNthCalledWith(
			5,
			'put',
			'http://localhost:3000/default/server/1100/port/my_port/channel/2'
		)
		// Reset the port
		expect(onRequest).toHaveBeenNthCalledWith(
			6,
			'post',
			'http://localhost:3000/default/server/1100/port/my_port/reset'
		)

		clearMocks()
		commandReceiver0.mockClear()

		quantelServer.ignoreConnectivityCheck = true

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'video0',
				enable: {
					start: 11000,
					duration: 5000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.QUANTEL,

					guid: 'abcdef872832832a2b932c97d9b2eb9',

					// seek?: number
					// inPoint?: number
					// length?: number
					// pauseTime?: number
					// playing?: boolean
					// noStarttime?: boolean
				},
			},
		])
		// Time to preload the clip
		await mockTime.advanceTimeToTicks(10990)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			10155,
			expect.objectContaining({
				type: QuantelCommandType.LOADCLIPFRAGMENTS,
			}),
			expect.any(String),
			expect.any(String)
		)

		// expect(onRequest).toHaveBeenCalledTimes(6)

		// Search for and get clip info:
		expect(onRequest).toHaveBeenNthCalledWith(
			1,
			'get',
			expect.stringContaining('/default/clip?ClipGUID=%22abcdef872832832a2b932c97d9b2eb9%22')
		)
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('/default/clip/1337'))
		// Fetch fragments:
		expect(onRequest).toHaveBeenNthCalledWith(3, 'get', expect.stringContaining('clip/1337/fragments'))
		// get port info
		expect(onRequest).toHaveBeenNthCalledWith(4, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Load fragments
		expect(onRequest).toHaveBeenNthCalledWith(5, 'post', expect.stringContaining('port/my_port/fragments'))
		// Prepare jump:
		expect(onRequest).toHaveBeenNthCalledWith(6, 'put', expect.stringContaining('port/my_port/jump?offset='))

		clearMocks()
		commandReceiver0.mockClear()

		// Time to start playing
		await mockTime.advanceTimeToTicks(11300)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			11000,
			expect.objectContaining({
				type: QuantelCommandType.PLAYCLIP,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(3)

		// Trigger Jump
		// expect(onRequest).toHaveBeenNthCalledWith(1, 'post', expect.stringContaining('/default/server/1100/port/my_port/trigger/JUMP'))
		// Trigger play
		expect(onRequest).toHaveBeenNthCalledWith(
			1,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/START')
		)
		// Check that play worked
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Plan to stop at end of clip
		expect(onRequest).toHaveBeenNthCalledWith(
			3,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/STOP?offset=1999')
		)

		clearMocks()
		commandReceiver0.mockClear()

		// Time to stop playing
		await mockTime.advanceTimeToTicks(16050)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			16000,
			expect.objectContaining({
				type: QuantelCommandType.CLEARCLIP,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(1)
		// Clear port from clip (reset port)
		expect(onRequest).toHaveBeenNthCalledWith(1, 'post', expect.stringContaining('port/my_port/reset'))

		await myConductor.destroy()
		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})
	test('Play, seek and re-use clip', async () => {
		let device: any = undefined
		const commandReceiver0: any = jest.fn((...args) => {
			// pipe through the command
			return device._defaultCommandReceiver(...args)
		})

		const myLayerMapping0: MappingQuantel = {
			device: DeviceType.QUANTEL,
			deviceId: 'myQuantel',

			portId: 'my_port',
			channelId: 2,
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		const errorHandler = jest.fn()
		myConductor.on('error', errorHandler)

		await myConductor.init()

		await t(
			myConductor.addDevice('myQuantel', {
				type: DeviceType.QUANTEL,
				options: {
					commandReceiver: commandReceiver0,
					// host: '127.0.0.1'

					gatewayUrl: 'localhost:3000',
					ISAUrlMaster: 'myISA:8000',
					zoneId: undefined, // fallback to 'default'
					serverId: 1100,
				},
			}),
			mockTime
		)

		const deviceContainer = myConductor.getDevice('myQuantel')
		device = deviceContainer.device as ThreadedClass<QuantelDevice>
		const deviceErrorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		device.on('error', deviceErrorHandler)
		device.on('commandError', deviceErrorHandler)

		device.on('error', console.log)
		device.on('commandError', console.log)

		myConductor.setTimelineAndMappings([], myLayerMapping)

		await mockTime.advanceTimeToTicks(15000)
		clearMocks()
		commandReceiver0.mockClear()
		quantelServer.ignoreConnectivityCheck = true

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'video0',
				enable: {
					start: 15000, // now
					duration: 1000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.QUANTEL,

					title: 'Test0',

					// seek?: number
					// inPoint?: number
					// length?: number
					// pauseTime?: number
					// playing?: boolean
					// noStarttime?: boolean
				},
			},
			{
				id: 'video1',
				enable: {
					start: '#video0.start + 200', // 15200
					duration: 300, // 15500
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.QUANTEL,

					title: 'myClip0',
				},
			},
			{
				id: 'video0_again', // it should be possible to remove this object when the timeline hass added support for instance.contentStart
				enable: {
					start: '#video1.end', // 15500
					end: 16000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.QUANTEL,

					title: 'Test0',

					inPoint: 500,
				},
			},
		])
		// What's going to happen:
		// 15000: clip Test0 starts playing
		// 15200: clip myClip starts playing (replaces old clip)
		// 15500: clip Test0 resumes playing
		// 16000: port is cleared

		await mockTime.advanceTimeToTicks(15150)
		expect(commandReceiver0).toHaveBeenCalledTimes(3)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			15005,
			expect.objectContaining({
				type: QuantelCommandType.LOADCLIPFRAGMENTS,
				time: 15005,
			}),
			expect.any(String),
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			15010,
			expect.objectContaining({
				type: QuantelCommandType.PLAYCLIP,
				time: 15005,
			}),
			expect.any(String),
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			3,
			15070,
			expect.objectContaining({
				type: QuantelCommandType.LOADCLIPFRAGMENTS,
				time: 15055,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(14)
		// Search for and get clip info:
		expect(onRequest).toHaveBeenNthCalledWith(1, 'get', expect.stringContaining('/default/clip?Title=%22Test0%22'))
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('/default/clip/2'))
		// Fetch fragments:
		expect(onRequest).toHaveBeenNthCalledWith(3, 'get', expect.stringContaining('clip/2/fragments'))
		// get port info
		expect(onRequest).toHaveBeenNthCalledWith(4, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Load fragments
		expect(onRequest).toHaveBeenNthCalledWith(5, 'post', expect.stringContaining('port/my_port/fragments'))

		// Note: These are skipped since the playhead is already there:
		/*
		// Prepare jump
		expect(onRequest).toHaveBeenNthCalledWith(6, 'put', expect.stringContaining('port/my_port/jump?offset=0'))
		// Trigger Jump
		expect(onRequest).toHaveBeenNthCalledWith(6, 'post', expect.stringContaining('/default/server/1100/port/my_port/trigger/JUMP'))
		*/

		// Trigger play
		expect(onRequest).toHaveBeenNthCalledWith(
			6,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/START')
		)
		// Check that play worked
		expect(onRequest).toHaveBeenNthCalledWith(7, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Plan to stop at end of clip
		expect(onRequest).toHaveBeenNthCalledWith(
			8,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/STOP?offset=999')
		)

		// Search for and get clip info:
		expect(onRequest).toHaveBeenNthCalledWith(
			9,
			'get',
			expect.stringContaining('/default/clip?Title=%22myClip0%22')
		)
		expect(onRequest).toHaveBeenNthCalledWith(10, 'get', expect.stringContaining('/default/clip/1337'))
		// Fetch fragments:
		expect(onRequest).toHaveBeenNthCalledWith(11, 'get', expect.stringContaining('clip/1337/fragments'))
		// get port info
		expect(onRequest).toHaveBeenNthCalledWith(
			12,
			'get',
			expect.stringContaining('default/server/1100/port/my_port')
		)
		// Load fragments
		expect(onRequest).toHaveBeenNthCalledWith(
			13,
			'post',
			expect.stringContaining('port/my_port/fragments?offset=1000')
		)
		// Prepare jump
		expect(onRequest).toHaveBeenNthCalledWith(14, 'put', expect.stringContaining('port/my_port/jump?offset=1000'))

		clearMocks()
		commandReceiver0.mockClear()
		// Time to start playing
		await mockTime.advanceTimeToTicks(15300)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			15200,
			expect.objectContaining({
				type: QuantelCommandType.PLAYCLIP,
			}),
			expect.any(String),
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			15265,
			expect.objectContaining({
				type: QuantelCommandType.LOADCLIPFRAGMENTS,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(9)
		// Trigger Jump
		expect(onRequest).toHaveBeenNthCalledWith(
			1,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/JUMP')
		)
		// Trigger play
		expect(onRequest).toHaveBeenNthCalledWith(
			2,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/START')
		)
		// Check that play worked
		expect(onRequest).toHaveBeenNthCalledWith(3, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Plan to stop at end of clip
		expect(onRequest).toHaveBeenNthCalledWith(
			4,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/STOP?offset=2999')
		)

		// Load next clip:

		// Search for and get clip info:
		// expect(onRequest).toHaveBeenNthCalledWith(4, 'get', expect.stringContaining('/default/clip?Title=%22myClip0%22')) // already have this info
		expect(onRequest).toHaveBeenNthCalledWith(5, 'get', expect.stringContaining('/default/clip/2'))
		// Fetch fragments:
		expect(onRequest).toHaveBeenNthCalledWith(6, 'get', expect.stringContaining('clip/2/fragments/13-1000'))
		// get port info
		expect(onRequest).toHaveBeenNthCalledWith(7, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Load fragments
		expect(onRequest).toHaveBeenNthCalledWith(
			8,
			'post',
			expect.stringContaining('port/my_port/fragments?offset=3000')
		)
		// Prepare jump
		expect(onRequest).toHaveBeenNthCalledWith(9, 'put', expect.stringContaining('port/my_port/jump?offset=3000'))

		clearMocks()
		commandReceiver0.mockClear()
		// Time to start playing
		await mockTime.advanceTimeToTicks(15700)

		expect(onRequest).toHaveBeenCalledTimes(4)

		// Trigger Jump
		expect(onRequest).toHaveBeenNthCalledWith(
			1,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/JUMP')
		)
		// Trigger play
		expect(onRequest).toHaveBeenNthCalledWith(
			2,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/START')
		)
		// Check that play worked
		expect(onRequest).toHaveBeenNthCalledWith(3, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Plan to stop at end of clip
		expect(onRequest).toHaveBeenNthCalledWith(
			4,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/STOP?offset=3986')
		)

		clearMocks()
		commandReceiver0.mockClear()

		// Time to stop playing
		await mockTime.advanceTimeToTicks(16050)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			16000,
			expect.objectContaining({
				type: QuantelCommandType.CLEARCLIP,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(1)
		// Clear port from clip (reset port)
		expect(onRequest).toHaveBeenNthCalledWith(1, 'post', expect.stringContaining('port/my_port/reset'))

		// onRequest.mock.calls.forEach(e => console.log(e))

		await myConductor.destroy()
		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})
	test('outTransition to clear', async () => {
		let device: any = undefined
		const commandReceiver0: any = jest.fn((...args) => {
			// pipe through the command
			return device._defaultCommandReceiver(...args)
		})

		const myLayerMapping0: MappingQuantel = {
			device: DeviceType.QUANTEL,
			deviceId: 'myQuantel',

			portId: 'my_port',
			channelId: 2,
			// keyChannelID: number
			// mode?: QuantelControlMode
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		const errorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		myConductor.on('error', errorHandler)
		myConductor.on('commandError', errorHandler)

		await myConductor.init()

		await t(
			myConductor.addDevice('myQuantel', {
				type: DeviceType.QUANTEL,
				options: {
					commandReceiver: commandReceiver0,
					// host: '127.0.0.1'

					gatewayUrl: 'localhost:3000',
					ISAUrlMaster: 'myISA:8000',
					zoneId: undefined, // fallback to 'default'
					serverId: 1100,
				},
			}),
			mockTime
		)

		const deviceContainer = myConductor.getDevice('myQuantel')
		device = deviceContainer.device as ThreadedClass<QuantelDevice>
		const deviceErrorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		device.on('error', deviceErrorHandler)
		device.on('commandError', deviceErrorHandler)

		myConductor.setTimelineAndMappings([], myLayerMapping)

		expect(mockTime.getCurrentTime()).toEqual(10000)
		await mockTime.advanceTimeToTicks(10100)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			expect.toBeCloseTo(10000, ADEV),
			expect.objectContaining({
				type: QuantelCommandType.SETUPPORT,
				time: 10005, // Because it was so close to currentTime, otherwise 9000
			}),
			expect.any(String),
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			expect.toBeCloseTo(10000, ADEV),
			expect.objectContaining({
				type: QuantelCommandType.CLEARCLIP,
				time: 10005,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(6)

		// Connect to ISA
		expect(onRequest).toHaveBeenNthCalledWith(1, 'post', 'http://localhost:3000/connect/myISA%3A8000')
		// get initial server info
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', 'http://localhost:3000/default/server')

		// Set up port:
		// get server info
		expect(onRequest).toHaveBeenNthCalledWith(3, 'get', 'http://localhost:3000/default/server')
		// get port info
		expect(onRequest).toHaveBeenNthCalledWith(4, 'get', 'http://localhost:3000/default/server/1100/port/my_port')
		// create new port and assign to channel
		expect(onRequest).toHaveBeenNthCalledWith(
			5,
			'put',
			'http://localhost:3000/default/server/1100/port/my_port/channel/2'
		)
		// Reset the port
		expect(onRequest).toHaveBeenNthCalledWith(
			6,
			'post',
			'http://localhost:3000/default/server/1100/port/my_port/reset'
		)

		clearMocks()
		commandReceiver0.mockClear()

		quantelServer.ignoreConnectivityCheck = true

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'video0',
				enable: {
					start: 11000,
					duration: 2000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.QUANTEL,

					title: 'myClip0',
					outTransition: {
						type: QuantelTransitionType.DELAY,
						delay: 1000, // ms
					},
				},
			},
		])
		// Time to preload the clip
		await mockTime.advanceTimeToTicks(10990)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			10155,
			expect.objectContaining({
				type: QuantelCommandType.LOADCLIPFRAGMENTS,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(6)

		// Search for and get clip info:
		expect(onRequest).toHaveBeenNthCalledWith(
			1,
			'get',
			expect.stringContaining('/default/clip?Title=%22myClip0%22')
		)
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('/default/clip/1337'))
		// Fetch fragments:
		expect(onRequest).toHaveBeenNthCalledWith(3, 'get', expect.stringContaining('clip/1337/fragments'))
		// get port info
		expect(onRequest).toHaveBeenNthCalledWith(4, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Load fragments
		expect(onRequest).toHaveBeenNthCalledWith(5, 'post', expect.stringContaining('port/my_port/fragments'))
		// Prepare jump:
		expect(onRequest).toHaveBeenNthCalledWith(6, 'put', expect.stringContaining('port/my_port/jump?offset='))

		clearMocks()
		commandReceiver0.mockClear()

		// Time to start playing
		await mockTime.advanceTimeToTicks(11300)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			11000,
			expect.objectContaining({
				type: QuantelCommandType.PLAYCLIP,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(3)

		// Trigger Jump
		// expect(onRequest).toHaveBeenNthCalledWith(1, 'post', expect.stringContaining('/default/server/1100/port/my_port/trigger/JUMP'))
		// Trigger play
		expect(onRequest).toHaveBeenNthCalledWith(
			1,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/START')
		)
		// Check that play worked
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Plan to stop at end of clip
		expect(onRequest).toHaveBeenNthCalledWith(
			3,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/STOP?offset=1999')
		)

		clearMocks()
		commandReceiver0.mockClear()

		// Time to stop playing
		await mockTime.advanceTimeToTicks(13050)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			13000,
			expect.objectContaining({
				type: QuantelCommandType.CLEARCLIP,
				transition: {
					type: QuantelTransitionType.DELAY,
					delay: 1000,
				},
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(0) // because of the outTransition

		await mockTime.advanceTimeToTicks(14050)

		expect(onRequest).toHaveBeenCalledTimes(1)
		// Clear port from clip (reset port)
		expect(onRequest).toHaveBeenNthCalledWith(1, 'post', expect.stringContaining('port/my_port/reset'))

		await myConductor.destroy()

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})
	test('outTransition to notOnAir', async () => {
		let device: any = undefined
		const commandReceiver0: any = jest.fn((...args) => {
			// pipe through the command
			return device._defaultCommandReceiver(...args)
		})

		const myLayerMapping0: MappingQuantel = {
			device: DeviceType.QUANTEL,
			deviceId: 'myQuantel',

			portId: 'my_port',
			channelId: 2,
			// keyChannelID: number
			// mode?: QuantelControlMode
		}
		const myLayerMapping: Mappings = {
			myLayer0: myLayerMapping0,
		}

		const myConductor = new Conductor({
			initializeAsClear: true,
			getCurrentTime: mockTime.getCurrentTime,
		})
		const errorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		myConductor.on('error', errorHandler)
		myConductor.on('commandError', errorHandler)

		await myConductor.init()

		await t(
			myConductor.addDevice('myQuantel', {
				type: DeviceType.QUANTEL,
				options: {
					commandReceiver: commandReceiver0,
					// host: '127.0.0.1'

					gatewayUrl: 'localhost:3000',
					ISAUrlMaster: 'myISA:8000',
					zoneId: undefined, // fallback to 'default'
					serverId: 1100,
				},
			}),
			mockTime
		)

		const deviceContainer = myConductor.getDevice('myQuantel')
		device = deviceContainer.device as ThreadedClass<QuantelDevice>
		const deviceErrorHandler = jest.fn((...args) => console.log('Error in device', ...args))
		device.on('error', deviceErrorHandler)
		device.on('commandError', deviceErrorHandler)

		myConductor.setTimelineAndMappings([], myLayerMapping)

		expect(mockTime.getCurrentTime()).toEqual(10000)
		await mockTime.advanceTimeToTicks(10100)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			expect.toBeCloseTo(10000, ADEV),
			expect.objectContaining({
				type: QuantelCommandType.SETUPPORT,
				time: 10005, // Because it was so close to currentTime, otherwise 9000
			}),
			expect.any(String),
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			expect.toBeCloseTo(10000, ADEV),
			expect.objectContaining({
				type: QuantelCommandType.CLEARCLIP,
				time: 10005,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(6)

		// Connect to ISA
		expect(onRequest).toHaveBeenNthCalledWith(1, 'post', 'http://localhost:3000/connect/myISA%3A8000')
		// get initial server info
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', 'http://localhost:3000/default/server')

		// Set up port:
		// get server info
		expect(onRequest).toHaveBeenNthCalledWith(3, 'get', 'http://localhost:3000/default/server')
		// get port info
		expect(onRequest).toHaveBeenNthCalledWith(4, 'get', 'http://localhost:3000/default/server/1100/port/my_port')
		// create new port and assign to channel
		expect(onRequest).toHaveBeenNthCalledWith(
			5,
			'put',
			'http://localhost:3000/default/server/1100/port/my_port/channel/2'
		)
		// Reset the port
		expect(onRequest).toHaveBeenNthCalledWith(
			6,
			'post',
			'http://localhost:3000/default/server/1100/port/my_port/reset'
		)

		clearMocks()
		commandReceiver0.mockClear()

		quantelServer.ignoreConnectivityCheck = true

		// Check that no commands has been scheduled:
		expect(await device.queue).toHaveLength(0)

		myConductor.setTimelineAndMappings([
			{
				id: 'video0',
				enable: {
					start: 11000,
					duration: 2000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.QUANTEL,

					title: 'myClip0',
					outTransition: {
						type: QuantelTransitionType.DELAY,
						delay: 1000, // ms
					},
				},
			},
			{
				id: 'video1',
				enable: {
					start: '#video0.end', // 13000
					duration: 2000,
				},
				layer: 'myLayer0',
				content: {
					deviceType: DeviceType.QUANTEL,
					title: 'Test0',
					notOnAir: true,
					// pauseTime: 13000,
					noStarttime: true,
					playing: false,
				},
			},
		])
		// Time to preload the clip
		await mockTime.advanceTimeToTicks(10990)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			10155,
			expect.objectContaining({
				type: QuantelCommandType.LOADCLIPFRAGMENTS,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(6)

		// Search for and get clip info:
		expect(onRequest).toHaveBeenNthCalledWith(
			1,
			'get',
			expect.stringContaining('/default/clip?Title=%22myClip0%22')
		)
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('/default/clip/1337'))
		// Fetch fragments:
		expect(onRequest).toHaveBeenNthCalledWith(3, 'get', expect.stringContaining('clip/1337/fragments'))
		// get port info
		expect(onRequest).toHaveBeenNthCalledWith(4, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Load fragments
		expect(onRequest).toHaveBeenNthCalledWith(5, 'post', expect.stringContaining('port/my_port/fragments'))
		// Prepare jump:
		expect(onRequest).toHaveBeenNthCalledWith(6, 'put', expect.stringContaining('port/my_port/jump?offset=0'))

		clearMocks()
		commandReceiver0.mockClear()

		// Time to start playing
		await mockTime.advanceTimeToTicks(11300)

		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			11000,
			expect.objectContaining({
				type: QuantelCommandType.PLAYCLIP,
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(3)

		// Trigger Jump
		// expect(onRequest).toHaveBeenNthCalledWith(1, 'post', expect.stringContaining('/default/server/1100/port/my_port/trigger/JUMP'))
		// Trigger play
		expect(onRequest).toHaveBeenNthCalledWith(
			1,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/START')
		)
		// Check that play worked
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Plan to stop at end of clip
		expect(onRequest).toHaveBeenNthCalledWith(
			3,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/STOP?offset=1999')
		)

		clearMocks()
		commandReceiver0.mockClear()

		// Time to stop playing

		await mockTime.advanceTimeToTicks(13050)

		expect(commandReceiver0).toHaveBeenCalledTimes(2)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			12000,
			expect.objectContaining({
				type: QuantelCommandType.LOADCLIPFRAGMENTS,
			}),
			expect.any(String),
			expect.any(String)
		)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			2,
			13000,
			expect.objectContaining({
				type: QuantelCommandType.PAUSECLIP,
				transition: {
					type: QuantelTransitionType.DELAY,
					delay: 1000,
				},
			}),
			expect.any(String),
			expect.any(String)
		)

		expect(onRequest).toHaveBeenCalledTimes(6) // because of the outTransition of #video0

		// Search for and get clip info:
		expect(onRequest).toHaveBeenNthCalledWith(1, 'get', expect.stringContaining('/default/clip?Title=%22Test0%22'))
		expect(onRequest).toHaveBeenNthCalledWith(2, 'get', expect.stringContaining('/default/clip/2'))
		// Fetch fragments:
		expect(onRequest).toHaveBeenNthCalledWith(3, 'get', expect.stringContaining('clip/2/fragments'))
		// get port info
		expect(onRequest).toHaveBeenNthCalledWith(4, 'get', expect.stringContaining('default/server/1100/port/my_port'))
		// Load fragments
		expect(onRequest).toHaveBeenNthCalledWith(5, 'post', expect.stringContaining('port/my_port/fragments'))
		// Prepare jump:
		expect(onRequest).toHaveBeenNthCalledWith(6, 'put', expect.stringContaining('port/my_port/jump?offset=2000'))

		clearMocks()
		commandReceiver0.mockClear()
		await mockTime.advanceTimeToTicks(14050)
		expect(onRequest).toHaveBeenCalledTimes(2)
		// Trigger STOP
		expect(onRequest).toHaveBeenNthCalledWith(
			1,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/STOP')
		)
		// Trigger JUMP
		expect(onRequest).toHaveBeenNthCalledWith(
			2,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/trigger/JUMP')
		)

		clearMocks()
		commandReceiver0.mockClear()

		await mockTime.advanceTimeToTicks(16050)
		expect(commandReceiver0).toHaveBeenCalledTimes(1)
		expect(commandReceiver0).toHaveBeenNthCalledWith(
			1,
			expect.toBeCloseTo(15000, 5),
			expect.objectContaining({
				type: QuantelCommandType.CLEARCLIP,
			}),
			expect.any(String),
			expect.any(String)
		)
		expect(onRequest).toHaveBeenCalledTimes(1)
		// Clear port from clip (reset port)
		expect(onRequest).toHaveBeenNthCalledWith(
			1,
			'post',
			expect.stringContaining('/default/server/1100/port/my_port/reset')
		)

		await myConductor.destroy()

		expect(errorHandler).toHaveBeenCalledTimes(0)
		expect(deviceErrorHandler).toHaveBeenCalledTimes(0)
	})
})
