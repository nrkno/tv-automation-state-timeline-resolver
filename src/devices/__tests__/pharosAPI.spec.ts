import {
	Pharos,
	SystemInfo,
	ProjectInfo,
	CurrentTime,
	TimelineInfo,
	SceneInfo,
	GroupInfo,
	ControllerInfo,
	Temperature,
	RemoteDeviceInfo,
	TextSlot,
	Protocols,
	Output,
	LuaVariables,
	FanSpeed,
	ContentTargetInfo,
	Triggers,
	Protocol,
} from '../pharosAPI'
import { getMockCall } from '../../__tests__/lib'
import * as WebSocket from '../../__mocks__/ws'
import * as request from '../../__mocks__/request'

const orgSetTimeout = setTimeout

function getStandardPharosMockReply() {
	return jest.fn((_ws: WebSocket, message: string) => {
		const data = JSON.parse(message)
		if (data.request) {
			const reply = ((): any => {
				if (data.request === 'system') {
					return {
						hardware_type: 'lpc',
						channel_capacity: 512,
						serial_number: '006321',
						memory_total: '12790Kb',
						memory_used: '24056Kb',
						memory_free: '103884Kb',
						storage_size: '1914MB',
						bootloader_version: '0.9.0',
						firmware_version: '2.5.2',
						reset_reason: 'Software Reset',
						last_boot_time: 123456,
						ip_address: '192.168.1.3',
						subnet_mask: '255.255.255.0',
						default_gateway: '192.168.1.3',
					}
				} else if (data.request === 'project') {
					return {
						name: 'Help Project',
						author: 'Pharos',
						filename: 'help_project_v1.pd2',
						unique_id: '{6b48627a-1d5e-4b2f-81e2-481e092a6a79}',
					}
				} else if (data.request === 'time') {
					return {
						datetime: '01 Feb 2017 13:44:42',
						local_time: 1485956682,
						uptime: 493347,
					}
				} else if (data.request === 'timeline') {
					return {
						timelines: [
							{
								num: parseInt(data.num, 10),
								name: 'Timeline ' + data.num,
								group: 'A',
								length: 10000,
								source_bus: 'internal',
								timecode_format: 'SMPTE30',
								audio_band: 1,
								audio_channel: 'combined',
								audio_peak: false,
								time_offset: 5000,
								state: 'running',
								onstage: true,
								position: 10000,
								priority: 'normal',
							},
						],
					}
				} else if (data.request === 'scene') {
					return {
						scenes: [
							{
								num: parseInt(data.num, 10),
								name: 'Scene ' + data.num,
								state: 'none',
								onstage: false,
							},
						],
					}
				} else if (data.request === 'group') {
					return {
						groups: [
							{
								num: parseInt(data.num, 10),
								name: 'Group ' + data.num,
								level: 100,
							},
						],
					}
				} else if (data.request === 'contenttargetinfo') {
					return {}
				} else if (data.request === 'controller') {
					return {
						controllers: [
							{
								num: 1,
								type: 'LPC',
								name: 'Controller 1',
								serial: '009060',
								ip_address: '192.168.1.3',
								online: true,
							},
						],
					}
				} else if (data.request === 'remote_device') {
					return {
						remote_devices: [
							{
								num: 1,
								type: 'RIO 44',
								serial: ['001234'],
								outputs: [
									{ output: 1, value: true },
									{ output: 2, value: true },
									{ output: 3, value: true },
									{ output: 4, value: true },
								],
								online: true,
							},
						],
					}
				} else if (data.request === 'temperature') {
					return {
						temp: {
							sys_temp: 40, //  (only for LPC X and VLC/VLC +)
							core1_temp: 44, //  (only for LPC X and VLC/VLC +)
							core2_temp: 44, //  (only for LPC X rev 1
							ambient_temp: 36.900001525878906, //  (only for TPC, LPC X rev 1)
							cc_temp: 44, //  (only for LPC X rev 2 and VLC/VLC +)
							gpu_temp: 44, //  (only for VLC/VLC +)
						},
					}
				} else if (data.request === 'fan_speed') {
					return {
						fan_speed: 1234,
					}
				} else if (data.request === 'text_slot') {
					return {
						text_slots: [
							{
								name: 'test',
								value: 'example',
							},
						],
					}
				} else if (data.request === 'protocol') {
					return {
						outputs: [
							{
								type: 1,
								disabled: false,
								name: 'DMX',
								universes: [
									{
										key: {
											kinet_port: 1,
											kinet_power_supply_num: 1,
										},
										name: 'string',
									},
								],
							},
						],
					}
				} else if (data.request === 'output') {
					if (data.universe === 'dmx:1') {
						return {
							channels: [0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 0, 0, 0, 0],
							disabled: false,
							proxied_tpc_name: 'Controller 1',
						}
					}
				} else if (data.request === 'lua') {
					if (data.variables === 'one,two') {
						return {
							one: 1,
							two: 2,
						}
					}
				} else if (data.request === 'trigger') {
					return {
						triggers: [
							{
								num: 1,
								actions: [
									{
										text: 'Start Timeline 1',
									},
								],
								conditions: [
									{
										text: 'Before 12:00:00 every day',
									},
								],
								name: 'Startup',
								trigger_text: 'At startup',
								type: 'Startup',
							},
						],
					}
				} else if (data.request === 'content_target') {
					return {
						unknown_data_structure: 1,
					}
				} else {
					console.log('Unsupported mock data: ', data)
					throw new Error('Unsupported mock data')
				}
			})()
			return {
				request: data.request,
				data: reply,
			}
		} else if (data.subscribe) {
			if (
				data.subscribe === 'timeline' ||
				data.subscribe === 'timeline' ||
				data.subscribe === 'scene' ||
				data.subscribe === 'group' ||
				data.subscribe === 'content_target' ||
				data.subscribe === 'remote_device' ||
				data.subscribe === 'beacon' ||
				data.subscribe === 'lua'
			) {
				return null
			} else {
				console.log('Unsupported mock data: ', data)
				throw new Error('Unsupported mock data')
			}
		} else {
			console.log('Unsupported mock data: ', data)
			throw new Error('Unsupported mock data')
		}
	})
}
function wait(time = 1) {
	return new Promise((resolve) => {
		orgSetTimeout(resolve, time)
	})
}
describe('PharosAPI', () => {
	jest.mock('ws', () => WebSocket)
	jest.mock('request', () => request)

	const requestReturnsOK = true
	function handleRequest(
		url: string,
		_options: Record<string, unknown>,
		callback: (e: null, r: Record<string, unknown>) => void
	) {
		orgSetTimeout(() => {
			let body = ''
			if (url.match(/api\/log/)) {
				body = "my little log\nOo, here's an entry"
			}
			callback(null, {
				statusCode: requestReturnsOK ? 200 : 500,
				body: body,
			})
		}, 1)
	}

	const onGet = jest.fn(handleRequest)
	const onPost = jest.fn(handleRequest)
	const onPut = jest.fn(handleRequest)
	const onHead = jest.fn(handleRequest)
	const onPatch = jest.fn(handleRequest)
	const onDel = jest.fn(handleRequest)
	const onDelete = jest.fn(handleRequest)

	request.setMockGet(onGet as any)
	request.setMockPost(onPost as any)
	request.setMockPut(onPut as any)
	request.setMockHead(onHead as any)
	request.setMockPatch(onPatch as any)
	request.setMockDel(onDel as any)
	request.setMockDelete(onDelete as any)

	beforeEach(() => {
		jest.useFakeTimers()
		WebSocket.clearMockInstances()
		onGet.mockClear()
		onPost.mockClear()
		onPut.mockClear()
		onHead.mockClear()
		onPatch.mockClear()
		onDel.mockClear()
		onDelete.mockClear()
	})
	test('Connectivity', async () => {
		const mockReply = getStandardPharosMockReply()
		const onError = jest.fn()
		const onRestart = jest.fn()
		const onConnected = jest.fn()
		const onDisconnected = jest.fn()

		let allowSocketConnected = true

		WebSocket.mockConstructor((ws: any) => {
			ws._mockConnect = allowSocketConnected
			ws.mockReplyFunction((message: string) => {
				if (message === '') return '' // ping message
				return mockReply(ws, message)
			})
		})

		const pharos = new Pharos()
		pharos.on('error', onError)
		pharos.on('restart', onRestart)
		pharos.on('connected', onConnected)
		pharos.on('disconnected', onDisconnected)

		await pharos.connect({
			host: '127.0.0.1',
			ssl: false,
		})

		let wsInstances = WebSocket.getMockInstances()
		expect(wsInstances).toHaveLength(1)
		let wsInstance = wsInstances[0]

		expect(wsInstance.readyState).toEqual(wsInstance.OPEN)
		expect(onError).toHaveBeenCalledTimes(0)
		expect(onConnected).toHaveBeenCalledTimes(1)
		expect(onDisconnected).toHaveBeenCalledTimes(0)
		expect(onRestart).toHaveBeenCalledTimes(0)
		expect(pharos.connected).toEqual(true)

		// socket connection is closed
		wsInstance.mockSetConnected(false)
		expect(pharos.connected).toEqual(false)

		// Failed reconnection attempt:
		allowSocketConnected = false
		jest.advanceTimersByTime(4000)
		await wait(1)

		wsInstances = WebSocket.getMockInstances()
		expect(wsInstances).toHaveLength(2) // a new socket connection should have been attempted
		expect(pharos.connected).toEqual(false)
		expect(onDisconnected).toHaveBeenCalledTimes(1)
		expect(onError).toHaveBeenCalledTimes(1)
		expect(getMockCall(onError, 0, 0).toString()).toMatch(/timeout/i)

		// Successful reconnection attempt:
		allowSocketConnected = true
		// Allow time to pass and triggers to run:
		jest.advanceTimersByTime(1000)
		await wait(1)
		jest.advanceTimersByTime(1000)
		await wait(1)

		wsInstances = WebSocket.getMockInstances()
		expect(pharos.connected).toEqual(true)
		expect(onConnected).toHaveBeenCalledTimes(2)
		expect(wsInstances).toHaveLength(3) // a new socket connection should have been attempted
		wsInstance = wsInstances[2]

		await pharos.dispose()
		expect(wsInstance.readyState).toEqual(wsInstance.CLOSED)
		expect(pharos.connected).toEqual(false)

		expect(onDisconnected).toHaveBeenCalledTimes(2)
		expect(onError).toHaveBeenCalledTimes(1)
	})
	test('Dispose', async () => {
		const mockReply = getStandardPharosMockReply()
		const onError = jest.fn()
		const onRestart = jest.fn()
		const onConnected = jest.fn()
		const onDisconnected = jest.fn()

		const allowSocketConnected = true

		WebSocket.mockConstructor((ws: any) => {
			ws._mockConnect = allowSocketConnected
			ws.mockReplyFunction((message: string) => {
				if (message === '') return '' // ping message
				return mockReply(ws, message)
			})
		})

		const pharos = new Pharos()
		pharos.on('error', onError)
		pharos.on('restart', onRestart)
		pharos.on('connected', onConnected)
		pharos.on('disconnected', onDisconnected)

		// dispose before connect:
		await pharos.dispose()
		expect(pharos.connected).toEqual(false)
		expect(onError).toHaveBeenCalledTimes(0)
		expect(onConnected).toHaveBeenCalledTimes(0)
		expect(onDisconnected).toHaveBeenCalledTimes(0)
		expect(onRestart).toHaveBeenCalledTimes(0)

		// (re)-connect after dispose:
		await pharos.connect({
			host: '127.0.0.1',
			ssl: false,
		})

		const wsInstances = WebSocket.getMockInstances()
		expect(wsInstances).toHaveLength(1)
		const wsInstance = wsInstances[0]

		expect(wsInstance.readyState).toEqual(wsInstance.OPEN)
		expect(onError).toHaveBeenCalledTimes(0)
		expect(onConnected).toHaveBeenCalledTimes(1)
		expect(onDisconnected).toHaveBeenCalledTimes(0)
		expect(onRestart).toHaveBeenCalledTimes(0)
		expect(pharos.connected).toEqual(true)

		// dispose during request
		const onCatch = jest.fn()
		pharos.getSystemInfo().catch(onCatch)
		await pharos.dispose()
		expect(onCatch).toHaveBeenCalledTimes(1)
		expect(getMockCall(onCatch, 0, 0)).toMatch(/disposing/i)
	})
	test('Basic methods', async () => {
		const mockReply = getStandardPharosMockReply()
		const onError = jest.fn()
		const onRestart = jest.fn()
		const onConnected = jest.fn()
		const onDisconnected = jest.fn()

		WebSocket.mockConstructor((ws: any) => {
			ws.mockReplyFunction((message: string) => {
				if (message === '') return '' // ping message
				return mockReply(ws, message)
			})
		})
		const pharos = new Pharos()
		pharos.on('error', onError)
		pharos.on('restart', onRestart)
		pharos.on('connected', onConnected)
		pharos.on('disconnected', onDisconnected)

		await pharos.connect({
			host: '127.0.0.1',
			ssl: false,
		})

		// let wsInstances = WebSocket.getMockInstances()
		// expect(wsInstances).toHaveLength(1)
		// let wsInstance = wsInstances[0]

		expect(pharos.connected).toEqual(true)

		expect(await pharos.getSystemInfo()).toMatchObject({
			hardware_type: 'lpc',
			channel_capacity: 512,
			serial_number: '006321',
			memory_total: '12790Kb',
			memory_used: '24056Kb',
			memory_free: '103884Kb',
			storage_size: '1914MB',
			bootloader_version: '0.9.0',
			firmware_version: '2.5.2',
			reset_reason: 'Software Reset',
			// last_boot_time: 'unknown',
			ip_address: '192.168.1.3',
			subnet_mask: '255.255.255.0',
			default_gateway: '192.168.1.3',
		} as SystemInfo)
		expect(await pharos.getProjectInfo()).toMatchObject({
			name: 'Help Project',
			author: 'Pharos',
			filename: 'help_project_v1.pd2',
			unique_id: '{6b48627a-1d5e-4b2f-81e2-481e092a6a79}',
		} as ProjectInfo)
		expect(await pharos.getCurrentTime()).toMatchObject({
			datetime: '01 Feb 2017 13:44:42',
			local_time: 1485956682,
			uptime: 493347,
		} as CurrentTime)
		expect(await pharos.getTimelineInfo(5)).toMatchObject({
			timelines: [
				{
					num: 5,
					name: 'Timeline 5',
					group: 'A',
					length: 10000,
					source_bus: 'internal',
					timecode_format: 'SMPTE30',
					audio_band: 1,
					audio_channel: 'combined',
					audio_peak: false,
					time_offset: 5000,
					state: 'running',
					onstage: true,
					position: 10000,
					priority: 'normal',
				},
			],
		} as TimelineInfo)
		expect(await pharos.getSceneInfo(5)).toMatchObject({
			scenes: [
				{
					num: 5,
					name: 'Scene 5',
					state: 'none',
					onstage: false,
				},
			],
		} as SceneInfo)
		expect(await pharos.getGroupInfo(5)).toMatchObject({
			groups: [
				{
					num: 5,
					name: 'Group 5',
					level: 100,
				},
			],
		} as GroupInfo)
		expect(await pharos.getControllerInfo()).toMatchObject({
			controllers: [
				{
					num: 1,
					type: 'LPC',
					name: 'Controller 1',
					serial: '009060',
					ip_address: '192.168.1.3',
					online: true,
				},
			],
		} as ControllerInfo)
		expect(await pharos.getTemperature()).toMatchObject({
			temp: {
				sys_temp: 40,
				core1_temp: 44,
				core2_temp: 44,
				ambient_temp: 36.900001525878906,
				cc_temp: 44,
				gpu_temp: 44,
			},
		} as Temperature)
		expect(await pharos.getRemoteDeviceInfo()).toMatchObject({
			remote_devices: [
				{
					num: 1,
					type: 'RIO 44',
					serial: ['001234'],
					outputs: [
						{ output: 1, value: true },
						{ output: 2, value: true },
						{ output: 3, value: true },
						{ output: 4, value: true },
					],
					online: true,
				},
			],
		} as RemoteDeviceInfo)
		expect(await pharos.getTextSlot()).toMatchObject({
			text_slots: [
				{
					name: 'test',
					value: 'example',
				},
			],
		} as TextSlot)
		expect(await pharos.getProtocols()).toMatchObject({
			outputs: [
				{
					type: 1,
					disabled: false,
					name: 'DMX',
					universes: [
						{
							key: {
								kinet_port: 1,
								kinet_power_supply_num: 1,
							},
							name: 'string',
						},
					],
				},
			],
		} as Protocols)
		expect(await pharos.getOutput('dmx:1')).toMatchObject({
			channels: [0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 0, 0, 0, 0],
			disabled: false,
			proxied_tpc_name: 'Controller 1',
		} as Output)
		expect(await pharos.getLuaVariables(['one', 'two'])).toMatchObject({
			one: 1,
			two: 2,
		} as LuaVariables)
		expect(await pharos.getFanSpeed()).toMatchObject({
			fan_speed: 1234,
		} as FanSpeed)
		expect(await pharos.getContentTargetInfo()).toMatchObject({
			unknown_data_structure: 1,
		} as ContentTargetInfo)
		expect(await pharos.getTriggers()).toMatchObject({
			triggers: [
				{
					num: 1,
					actions: [
						{
							text: 'Start Timeline 1',
						},
					],
					conditions: [
						{
							text: 'Before 12:00:00 every day',
						},
					],
					name: 'Startup',
					trigger_text: 'At startup',
					type: 'Startup',
				},
			],
		} as Triggers)

		await pharos.dispose()
		expect(pharos.connected).toEqual(false)

		expect(onError).toHaveBeenCalledTimes(0)
	})
	test('Subscriptions', async () => {
		const mockReply = getStandardPharosMockReply()
		const onError = jest.fn()
		const onRestart = jest.fn()
		const onConnected = jest.fn()
		const onDisconnected = jest.fn()

		WebSocket.mockConstructor((ws: any) => {
			ws.mockReplyFunction((message: string) => {
				if (message === '') return '' // ping message
				return mockReply(ws, message)
			})
		})
		const pharos = new Pharos()
		pharos.on('error', onError)
		pharos.on('restart', onRestart)
		pharos.on('connected', onConnected)
		pharos.on('disconnected', onDisconnected)

		await pharos.connect({
			host: '127.0.0.1',
			ssl: false,
		})

		const wsInstances = WebSocket.getMockInstances()
		expect(wsInstances).toHaveLength(1)
		const wsInstance = wsInstances[0]

		expect(pharos.connected).toEqual(true)
		expect(mockReply).toHaveBeenCalledTimes(0)

		const cbSubscribeTimelineStatus = jest.fn()
		const cbSubscribeSceneStatus = jest.fn()
		const cbSubscribeGroupStatus = jest.fn()
		const cbSubscribeContentTargetStatus = jest.fn()
		const cbSubscribeRemoteDeviceStatus = jest.fn()
		const cbSubscribeBeacon = jest.fn()
		const cbSubscribeLua = jest.fn()

		await pharos.subscribeTimelineStatus(cbSubscribeTimelineStatus)
		await pharos.subscribeSceneStatus(cbSubscribeSceneStatus)
		await pharos.subscribeGroupStatus(cbSubscribeGroupStatus)
		await pharos.subscribeContentTargetStatus(cbSubscribeContentTargetStatus)
		await pharos.subscribeRemoteDeviceStatus(cbSubscribeRemoteDeviceStatus)
		await pharos.subscribeBeacon(cbSubscribeBeacon)
		await pharos.subscribeLua(cbSubscribeLua)

		expect(mockReply).toHaveBeenCalledTimes(7)

		expect(cbSubscribeTimelineStatus).toHaveBeenCalledTimes(0)
		expect(cbSubscribeSceneStatus).toHaveBeenCalledTimes(0)
		expect(cbSubscribeGroupStatus).toHaveBeenCalledTimes(0)
		expect(cbSubscribeContentTargetStatus).toHaveBeenCalledTimes(0)
		expect(cbSubscribeRemoteDeviceStatus).toHaveBeenCalledTimes(0)
		expect(cbSubscribeBeacon).toHaveBeenCalledTimes(0)
		expect(cbSubscribeLua).toHaveBeenCalledTimes(0)

		wsInstance.mockSendMessage({
			broadcast: 'timeline',
			data: { unknown_data_structure: true },
		})
		expect(cbSubscribeTimelineStatus).toHaveBeenCalledTimes(1)

		wsInstance.mockSendMessage({
			broadcast: 'scene',
			data: { unknown_data_structure: true },
		})
		expect(cbSubscribeSceneStatus).toHaveBeenCalledTimes(1)

		wsInstance.mockSendMessage({
			broadcast: 'group',
			data: { unknown_data_structure: true },
		})
		expect(cbSubscribeGroupStatus).toHaveBeenCalledTimes(1)

		wsInstance.mockSendMessage({
			broadcast: 'content_target',
			data: { unknown_data_structure: true },
		})
		expect(cbSubscribeContentTargetStatus).toHaveBeenCalledTimes(1)

		wsInstance.mockSendMessage({
			broadcast: 'remote_device',
			data: { unknown_data_structure: true },
		})
		expect(cbSubscribeRemoteDeviceStatus).toHaveBeenCalledTimes(1)

		wsInstance.mockSendMessage({
			broadcast: 'beacon',
			data: { unknown_data_structure: true },
		})
		expect(cbSubscribeBeacon).toHaveBeenCalledTimes(1)

		wsInstance.mockSendMessage({
			broadcast: 'lua',
			data: { unknown_data_structure: true },
		})
		expect(cbSubscribeLua).toHaveBeenCalledTimes(1)

		await pharos.dispose()
		expect(pharos.connected).toEqual(false)

		expect(onError).toHaveBeenCalledTimes(0)
	})
	test('Handle Misc', async () => {
		const mockReply = getStandardPharosMockReply()
		const onError = jest.fn()
		const onRestart = jest.fn()
		const onConnected = jest.fn()
		const onDisconnected = jest.fn()

		WebSocket.mockConstructor((ws: any) => {
			ws.mockReplyFunction((message: string) => {
				if (message === '') return '' // ping message
				return mockReply(ws, message)
			})
		})
		const pharos = new Pharos()
		pharos.on('error', onError)
		pharos.on('restart', onRestart)
		pharos.on('connected', onConnected)
		pharos.on('disconnected', onDisconnected)

		await pharos.connect({
			host: '127.0.0.1',
			ssl: false,
		})

		const wsInstances = WebSocket.getMockInstances()
		expect(wsInstances).toHaveLength(1)

		expect(pharos.connected).toEqual(true)
		expect(mockReply).toHaveBeenCalledTimes(0)

		expect(onGet).toHaveBeenCalledTimes(0)
		expect(onPost).toHaveBeenCalledTimes(0)
		expect(onPut).toHaveBeenCalledTimes(0)
		expect(onHead).toHaveBeenCalledTimes(0)
		expect(onPatch).toHaveBeenCalledTimes(0)
		expect(onDel).toHaveBeenCalledTimes(0)
		expect(onDelete).toHaveBeenCalledTimes(0)

		await pharos.releaseAll('group0', 20)
		expect(onPost).toHaveBeenCalledTimes(1)
		expect(getMockCall(onPost, 0, 0)).toEqual('http://127.0.0.1/api/release_all')
		expect(getMockCall(onPost, 0, 1)).toMatchObject({
			group: 'group0',
			fade: 20,
		})
		onPost.mockClear()

		await pharos.pauseAll()
		expect(onPost).toHaveBeenCalledTimes(1)
		expect(getMockCall(onPost, 0, 0)).toEqual('http://127.0.0.1/api/timeline')
		expect(getMockCall(onPost, 0, 1)).toMatchObject({
			action: 'pause',
		})
		onPost.mockClear()

		await pharos.resumeAll()
		expect(onPost).toHaveBeenCalledTimes(1)
		expect(getMockCall(onPost, 0, 0)).toEqual('http://127.0.0.1/api/timeline')
		expect(getMockCall(onPost, 0, 1)).toMatchObject({
			action: 'resume',
		})
		onPost.mockClear()

		await pharos.fireTrigger(5, ['a', 'b'], true)
		expect(onPost).toHaveBeenCalledTimes(1)
		expect(getMockCall(onPost, 0, 0)).toEqual('http://127.0.0.1/api/trigger')
		expect(getMockCall(onPost, 0, 1)).toMatchObject({
			num: 5,
			var: 'a,b',
			conditions: true,
		})
		onPost.mockClear()

		await pharos.runCommand('scriptName01')
		expect(onPost).toHaveBeenCalledTimes(1)
		expect(getMockCall(onPost, 0, 0)).toEqual('http://127.0.0.1/api/cmdline')
		expect(getMockCall(onPost, 0, 1)).toMatchObject({
			input: 'scriptName01',
		})
		onPost.mockClear()

		await pharos.masterIntensity(3, 15, 20, 1)
		expect(onPost).toHaveBeenCalledTimes(1)
		expect(getMockCall(onPost, 0, 0)).toEqual('http://127.0.0.1/api/group')
		expect(getMockCall(onPost, 0, 1)).toMatchObject({
			action: 'master_intensity',
			num: 3,
			level: 15,
			fade: 20,
			delay: 1,
		})
		onPost.mockClear()

		await pharos.masterContentTargetIntensity('primary', 15, 20, 1)
		expect(onPost).toHaveBeenCalledTimes(1)
		expect(getMockCall(onPost, 0, 0)).toEqual('http://127.0.0.1/api/content_target')
		expect(getMockCall(onPost, 0, 1)).toMatchObject({
			action: 'master_intensity',
			type: 'primary',
			level: 15,
			fade: 20,
			delay: 1,
		})
		onPost.mockClear()

		await pharos.resetHardware()
		expect(onPost).toHaveBeenCalledTimes(1)
		expect(getMockCall(onPost, 0, 0)).toEqual('http://127.0.0.1/api/reset')
		onPost.mockClear()

		await pharos.setGroupOverride(3, {
			intensity: 1,
			red: 255,
			green: 255,
			blue: 255,
			temperature: 255,
			fade: 2.1,
			path: 'Default',
		})
		expect(onPut).toHaveBeenCalledTimes(1)
		expect(getMockCall(onPut, 0, 0)).toEqual('http://127.0.0.1/api/override')
		expect(getMockCall(onPut, 0, 1)).toMatchObject({
			target: 'group',
			num: 3,
			intensity: 1,
			red: 255,
			green: 255,
			blue: 255,
			temperature: 255,
			fade: 2.1,
			path: 'Default',
		})
		onPut.mockClear()

		await pharos.clearGroupOverrides(3, 2.1)
		expect(onDelete).toHaveBeenCalledTimes(1)
		expect(getMockCall(onDelete, 0, 0)).toEqual('http://127.0.0.1/api/override')
		expect(getMockCall(onDelete, 0, 1)).toMatchObject({
			target: 'group',
			num: 3,
			fade: 2.1,
		})
		onDelete.mockClear()

		await pharos.clearGroupOverrides()
		expect(onDelete).toHaveBeenCalledTimes(1)
		expect(getMockCall(onDelete, 0, 0)).toEqual('http://127.0.0.1/api/override')
		expect(getMockCall(onDelete, 0, 1)).toMatchObject({
			target: 'group',
		})
		onDelete.mockClear()

		await pharos.setFixtureOverride(3, {
			intensity: 1,
			red: 255,
			green: 255,
			blue: 255,
			temperature: 255,
			fade: 2.1,
			path: 'Default',
		})
		expect(onPut).toHaveBeenCalledTimes(1)
		expect(getMockCall(onPut, 0, 0)).toEqual('http://127.0.0.1/api/override')
		expect(getMockCall(onPut, 0, 1)).toMatchObject({
			target: 'fixture',
			num: 3,
			intensity: 1,
			red: 255,
			green: 255,
			blue: 255,
			temperature: 255,
			fade: 2.1,
			path: 'Default',
		})
		onPut.mockClear()

		await pharos.clearFixtureOverrides(3, 2.1)
		expect(onDelete).toHaveBeenCalledTimes(1)
		expect(getMockCall(onDelete, 0, 0)).toEqual('http://127.0.0.1/api/override')
		expect(getMockCall(onDelete, 0, 1)).toMatchObject({
			target: 'fixture',
			num: 3,
			fade: 2.1,
		})
		onDelete.mockClear()

		await pharos.clearFixtureOverrides()
		expect(onDelete).toHaveBeenCalledTimes(1)
		expect(getMockCall(onDelete, 0, 0)).toEqual('http://127.0.0.1/api/override')
		expect(getMockCall(onDelete, 0, 1)).toMatchObject({
			target: 'fixture',
		})
		onDelete.mockClear()

		await pharos.clearAllOverrides()
		expect(onDelete).toHaveBeenCalledTimes(1)
		expect(getMockCall(onDelete, 0, 0)).toEqual('http://127.0.0.1/api/override')
		expect(getMockCall(onDelete, 0, 1)).toMatchObject({})
		onDelete.mockClear()

		await pharos.enableOutput(Protocol.DMX)
		expect(onPost).toHaveBeenCalledTimes(1)
		expect(getMockCall(onPost, 0, 0)).toEqual('http://127.0.0.1/api/output')
		expect(getMockCall(onPost, 0, 1)).toMatchObject({
			action: 'enable',
			protocol: 'dmx',
		})
		onPost.mockClear()

		await pharos.disableOutput(Protocol.DMX)
		expect(onPost).toHaveBeenCalledTimes(1)
		expect(getMockCall(onPost, 0, 0)).toEqual('http://127.0.0.1/api/output')
		expect(getMockCall(onPost, 0, 1)).toMatchObject({
			action: 'disable',
			protocol: 'dmx',
		})
		onPost.mockClear()

		await pharos.setTextSlot('slot1', 'myLittleValue')
		expect(onPut).toHaveBeenCalledTimes(1)
		expect(getMockCall(onPut, 0, 0)).toEqual('http://127.0.0.1/api/text_slot')
		expect(getMockCall(onPut, 0, 1)).toMatchObject({
			name: 'slot1',
			value: 'myLittleValue',
		})
		onPut.mockClear()

		await pharos.flashBeacon()
		expect(onPost).toHaveBeenCalledTimes(1)
		expect(getMockCall(onPost, 0, 0)).toEqual('http://127.0.0.1/api/beacon')
		onPost.mockClear()

		await pharos.parkChannel('dmx:1', ['1-5', 7], 128)
		expect(onPost).toHaveBeenCalledTimes(1)
		expect(getMockCall(onPost, 0, 0)).toEqual('http://127.0.0.1/api/channel')
		expect(getMockCall(onPost, 0, 1)).toMatchObject({
			universe: 'dmx:1',
			channels: '1-5,7',
			level: 128,
		})
		onPost.mockClear()

		await pharos.unparkChannel('dmx:1', ['1-5', 7])
		expect(onDelete).toHaveBeenCalledTimes(1)
		expect(getMockCall(onDelete, 0, 0)).toEqual('http://127.0.0.1/api/channel')
		expect(getMockCall(onDelete, 0, 1)).toMatchObject({
			universe: 'dmx:1',
			channels: '1-5,7',
		})
		onDelete.mockClear()

		const log = await pharos.getLog()
		expect(onGet).toHaveBeenCalledTimes(1)
		expect(getMockCall(onGet, 0, 0)).toEqual('http://127.0.0.1/api/log')
		expect(log).toMatch(/my little log/i)
		onGet.mockClear()

		await pharos.clearLog()
		expect(onDelete).toHaveBeenCalledTimes(1)
		expect(getMockCall(onDelete, 0, 0)).toEqual('http://127.0.0.1/api/log')
		onDelete.mockClear()

		await pharos.dispose()
		expect(pharos.connected).toEqual(false)

		expect(onError).toHaveBeenCalledTimes(0)
	})
	test('Handle Timeline', async () => {
		const mockReply = getStandardPharosMockReply()
		const onError = jest.fn()
		const onRestart = jest.fn()
		const onConnected = jest.fn()
		const onDisconnected = jest.fn()

		WebSocket.mockConstructor((ws: any) => {
			ws.mockReplyFunction((message: string) => {
				if (message === '') return '' // ping message
				return mockReply(ws, message)
			})
		})
		const pharos = new Pharos()
		pharos.on('error', onError)
		pharos.on('restart', onRestart)
		pharos.on('connected', onConnected)
		pharos.on('disconnected', onDisconnected)

		await pharos.connect({
			host: '127.0.0.1',
			ssl: false,
		})

		const wsInstances = WebSocket.getMockInstances()
		expect(wsInstances).toHaveLength(1)

		expect(pharos.connected).toEqual(true)
		expect(mockReply).toHaveBeenCalledTimes(0)

		expect(onGet).toHaveBeenCalledTimes(0)
		expect(onPost).toHaveBeenCalledTimes(0)
		expect(onPut).toHaveBeenCalledTimes(0)
		expect(onHead).toHaveBeenCalledTimes(0)
		expect(onPatch).toHaveBeenCalledTimes(0)
		expect(onDel).toHaveBeenCalledTimes(0)
		expect(onDelete).toHaveBeenCalledTimes(0)

		await pharos.startTimeline(5)
		expect(onPost).toHaveBeenCalledTimes(1)
		expect(getMockCall(onPost, 0, 0)).toEqual('http://127.0.0.1/api/timeline')
		expect(getMockCall(onPost, 0, 1)).toMatchObject({
			action: 'start',
			num: 5,
		})
		onPost.mockClear()

		await pharos.releaseTimeline(5, 20)
		expect(onPost).toHaveBeenCalledTimes(1)
		expect(getMockCall(onPost, 0, 0)).toEqual('http://127.0.0.1/api/timeline')
		expect(getMockCall(onPost, 0, 1)).toMatchObject({
			action: 'release',
			num: 5,
			fade: 20,
		})
		onPost.mockClear()

		await pharos.toggleTimeline(5, 20)
		expect(onPost).toHaveBeenCalledTimes(1)
		expect(getMockCall(onPost, 0, 0)).toEqual('http://127.0.0.1/api/timeline')
		expect(getMockCall(onPost, 0, 1)).toMatchObject({
			action: 'toggle',
			num: 5,
			fade: 20,
		})
		onPost.mockClear()

		await pharos.pauseTimeline(5)
		expect(onPost).toHaveBeenCalledTimes(1)
		expect(getMockCall(onPost, 0, 0)).toEqual('http://127.0.0.1/api/timeline')
		expect(getMockCall(onPost, 0, 1)).toMatchObject({
			action: 'pause',
			num: 5,
		})
		onPost.mockClear()

		await pharos.resumeTimeline(5)
		expect(onPost).toHaveBeenCalledTimes(1)
		expect(getMockCall(onPost, 0, 0)).toEqual('http://127.0.0.1/api/timeline')
		expect(getMockCall(onPost, 0, 1)).toMatchObject({
			action: 'resume',
			num: 5,
		})
		onPost.mockClear()

		await pharos.releaseAllTimelines('group0', 20)
		expect(onPost).toHaveBeenCalledTimes(1)
		expect(getMockCall(onPost, 0, 0)).toEqual('http://127.0.0.1/api/timeline')
		expect(getMockCall(onPost, 0, 1)).toMatchObject({
			action: 'release',
			group: 'group0',
			fade: 20,
		})
		onPost.mockClear()

		await pharos.setTimelineRate(5, 0.5)
		expect(onPost).toHaveBeenCalledTimes(1)
		expect(getMockCall(onPost, 0, 0)).toEqual('http://127.0.0.1/api/timeline')
		expect(getMockCall(onPost, 0, 1)).toMatchObject({
			action: 'set_rate',
			num: 5,
			rate: 0.5,
		})
		onPost.mockClear()

		await pharos.setTimelinePosition(5, 0.6)
		expect(onPost).toHaveBeenCalledTimes(1)
		expect(getMockCall(onPost, 0, 0)).toEqual('http://127.0.0.1/api/timeline')
		expect(getMockCall(onPost, 0, 1)).toMatchObject({
			action: 'set_position',
			num: 5,
			position: 0.6,
		})
		onPost.mockClear()

		await pharos.dispose()
		expect(pharos.connected).toEqual(false)

		expect(onError).toHaveBeenCalledTimes(0)
	})
	test('Handle Scene', async () => {
		const mockReply = getStandardPharosMockReply()
		const onError = jest.fn()
		const onRestart = jest.fn()
		const onConnected = jest.fn()
		const onDisconnected = jest.fn()

		WebSocket.mockConstructor((ws: any) => {
			ws.mockReplyFunction((message: string) => {
				if (message === '') return '' // ping message
				return mockReply(ws, message)
			})
		})
		const pharos = new Pharos()
		pharos.on('error', onError)
		pharos.on('restart', onRestart)
		pharos.on('connected', onConnected)
		pharos.on('disconnected', onDisconnected)

		await pharos.connect({
			host: '127.0.0.1',
			ssl: false,
		})

		const wsInstances = WebSocket.getMockInstances()
		expect(wsInstances).toHaveLength(1)

		expect(pharos.connected).toEqual(true)
		expect(mockReply).toHaveBeenCalledTimes(0)

		expect(onGet).toHaveBeenCalledTimes(0)
		expect(onPost).toHaveBeenCalledTimes(0)
		expect(onPut).toHaveBeenCalledTimes(0)
		expect(onHead).toHaveBeenCalledTimes(0)
		expect(onPatch).toHaveBeenCalledTimes(0)
		expect(onDel).toHaveBeenCalledTimes(0)
		expect(onDelete).toHaveBeenCalledTimes(0)

		await pharos.startScene(5)
		expect(onPost).toHaveBeenCalledTimes(1)
		expect(getMockCall(onPost, 0, 0)).toEqual('http://127.0.0.1/api/scene')
		expect(getMockCall(onPost, 0, 1)).toMatchObject({
			action: 'start',
			num: 5,
		})
		onPost.mockClear()

		await pharos.releaseScene(5, 20)
		expect(onPost).toHaveBeenCalledTimes(1)
		expect(getMockCall(onPost, 0, 0)).toEqual('http://127.0.0.1/api/scene')
		expect(getMockCall(onPost, 0, 1)).toMatchObject({
			action: 'release',
			num: 5,
			fade: 20,
		})
		onPost.mockClear()

		await pharos.toggleScene(5, 20)
		expect(onPost).toHaveBeenCalledTimes(1)
		expect(getMockCall(onPost, 0, 0)).toEqual('http://127.0.0.1/api/scene')
		expect(getMockCall(onPost, 0, 1)).toMatchObject({
			action: 'toggle',
			num: 5,
			fade: 20,
		})
		onPost.mockClear()

		await pharos.releaseAllScenes('group0', 20)
		expect(onPost).toHaveBeenCalledTimes(1)
		expect(getMockCall(onPost, 0, 0)).toEqual('http://127.0.0.1/api/scene')
		expect(getMockCall(onPost, 0, 1)).toMatchObject({
			action: 'release',
			group: 'group0',
			fade: 20,
		})
		onPost.mockClear()

		await pharos.dispose()
		expect(pharos.connected).toEqual(false)

		expect(onError).toHaveBeenCalledTimes(0)
	})
})
