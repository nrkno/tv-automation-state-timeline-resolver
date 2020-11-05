import _ from 'underscore'
import { Q } from 'tv-automation-quantel-gateway-client'
import * as got from '../../__mocks__/got'
// const orgSetTimeout = setTimeout

/*
	This file mocks the server-side part of the Quantel Gateway, ie the REST interface of
	https://github.com/nrkno/tv-automation-quantel-gateway
*/

export function setupQuantelGatewayMock() {
	const quantelServer: QuantelServerMockOptions = {
		ISAServerIsUp: true,
		requestReturnsOK: true,
		ignoreConnectivityCheck: false,
		ISAOptionHasBeenProvided: false,
		port: {
			my_port: {
				endOfData: 0,
				offset: -1,
			},
		},
	}

	const onRequest = jest.fn((_type: string, _url: string) => {
		// console.log('onRequest', type, url)
	})

	const onRequestRaw = jest.fn((type: string, url: string) => {
		if (quantelServer.ignoreConnectivityCheck && type === 'get' && url.match(/\/default\/server$/)) {
			// ignore, it's the "check server for uptime" call
		} else {
			onRequest(type, url)
		}
	})

	const onGet = jest.fn((options) => handleRequest(quantelServer, onRequestRaw, 'get', options))
	const onPost = jest.fn((options) => handleRequest(quantelServer, onRequestRaw, 'post', options))
	const onPut = jest.fn((options) => handleRequest(quantelServer, onRequestRaw, 'put', options))
	const onHead = jest.fn((options) => handleRequest(quantelServer, onRequestRaw, 'head', options))
	const onPatch = jest.fn((options) => handleRequest(quantelServer, onRequestRaw, 'patch', options))
	const onDel = jest.fn((options) => handleRequest(quantelServer, onRequestRaw, 'del', options))
	const onDelete = jest.fn((options) => handleRequest(quantelServer, onRequestRaw, 'delete', options))

	got.setMockGet(onGet)
	got.setMockPost(onPost)
	got.setMockPut(onPut)
	got.setMockHead(onHead)
	got.setMockPatch(onPatch)
	got.setMockDel(onDel)
	got.setMockDelete(onDelete)

	return {
		quantelServer,
		onRequest,
		onRequestRaw,
		onGet,
		onPost,
		onPut,
		onHead,
		onPatch,
		onDel,
		onDelete,
	}
}

type Params = { [key: string]: any }
interface QuantelServerMockOptions {
	ISAServerIsUp: boolean
	requestReturnsOK: boolean
	ignoreConnectivityCheck: boolean
	ISAOptionHasBeenProvided: boolean
	port: {
		[port: string]: QuantelServerMockOptionsPort
	}
}
interface QuantelServerMockOptionsPort {
	playing?: boolean
	endOfData: number
	offset: number
	jumpOffset?: number
}
interface ErrorResponse {
	status: number
	message: string
	stack: string
}
function urlRoute(
	requestType: string,
	url: string,
	routes: { [route: string]: (params: Params) => Record<string, any> | ErrorResponse }
): Record<string, unknown> {
	let body: any = {
		status: 404,
		message: `(Mock) Not found. Request ${requestType} ${url}`,
		stack: '',
	}

	const matchUrl = `${requestType} ${url}`
	let reroutedParams: any = null

	let found = false
	const routeKeys = Object.keys(routes).sort((a, b) => {
		if (a.length < b.length) return 1
		if (a.length > b.length) return -1
		return 0
	})
	routeKeys.forEach((route) => {
		if (!found) {
			const callback = routes[route]

			const paramList = route.match(/(:[^/]+)/g) || []

			route = route.replace(/\?/g, '\\?')

			paramList.forEach((param) => {
				route = route.replace(param, '([^\\/&]+)')
			})
			const m = matchUrl.match(new RegExp(route))
			if (m) {
				const params: Params = {}
				paramList.forEach((param, index: number) => {
					const p = param.slice(1) // remove the prepended ':'
					params[p] = m[index + 1]
				})

				body = callback(reroutedParams || params)

				if (body.__reroute === true) {
					// reroute to another other route
					if (!reroutedParams) reroutedParams = params
				} else {
					found = true
				}
			}
		}
	})
	return body
}
function handleRequest(
	quantelServer: QuantelServerMockOptions,
	triggerFcn: (type: string, url: string) => void,
	type: string,
	options: any
) {
	const url = options.url
	const bodyData = options.json
	return new Promise((resolve) => {
		triggerFcn(type, url)

		try {
			const resource = (url.match(/http:\/\/[^/]+(.*)/) || [])[1] || ''

			let body: Record<string, unknown> = {}
			// let m: any

			const searchClip = (params: Params): Q.ClipDataSummary[] | ErrorResponse => {
				if (!quantelServer.ISAOptionHasBeenProvided) return noIsaSetupResponse
				return _.filter<Q.ClipDataSummary[]>(
					[
						{
							type: 'ClipDataSummary',
							ClipID: 2,
							ClipGUID: '0b124a741fa84c3eb7a707d13cc1f5aa',
							CloneId: 2,
							Completed: '2019-06-12T11:18:37.000Z',
							Created: '2019-06-12T11:18:37.000Z',
							Description: '',
							Frames: '1000',
							Owner: '',
							PoolID: 11,
							Title: 'Test0',
						},
						{
							type: 'ClipDataSummary',
							ClipID: 1337,
							ClipGUID: 'abcdef872832832a2b932c97d9b2eb9',
							CloneId: 1337,
							Completed: '2019-06-12T11:18:37.000Z',
							Created: '2019-06-12T11:18:37.000Z',
							Description: '',
							Frames: '2000',
							Owner: '',
							PoolID: 11,
							Title: 'myClip0',
						},
						{
							type: 'ClipDataSummary',
							ClipID: 1338,
							ClipGUID: 'abcdef872832832a2b932c97d9b2ec1',
							CloneId: 1338,
							Completed: '2019-06-12T11:18:37.000Z',
							Created: '2019-06-12T11:18:37.000Z',
							Description: '',
							Frames: '2000',
							Owner: '',
							PoolID: 11,
							Title: 'myClip1',
						},
					],
					(clip) => {
						if (params.title) {
							return clip.Title === decodeURI(params.title).replace(/"/g, '')
						} else if (params.guid) {
							return clip.ClipGUID === decodeURI(params.guid).replace(/"/g, '')
						}
						return false
					}
				)
			}

			const noIsaSetupResponse: ErrorResponse = {
				status: 502,
				message: `ISA URL not provided`,
				stack: '',
			}
			// console.log(type, resource)

			body = urlRoute(type, resource, {
				'post /connect/:isaURL': (_params: Params) => {
					quantelServer.ISAOptionHasBeenProvided = true
					return {
						something: 1234,
					}
				},
				'get /:zoneID/server': (_params: Params): Q.ServerInfo[] | ErrorResponse => {
					if (!quantelServer.ISAOptionHasBeenProvided) return noIsaSetupResponse

					return [
						{
							type: 'Server',
							ident: 1100,
							down: !quantelServer.ISAServerIsUp,
							name: 'Dummy 1100',
							numChannels: 4,
							pools: [11],
							portNames: [],
							chanPorts: ['', '', '', ''],
						},
						{
							type: 'Server',
							ident: 1200,
							down: !quantelServer.ISAServerIsUp,
							name: 'Dummy 1200',
							numChannels: 2,
							pools: [12],
							portNames: [],
							chanPorts: ['', ''],
						},
						{
							type: 'Server',
							ident: 1300,
							down: !quantelServer.ISAServerIsUp,
							name: 'Dummy 1300',
							numChannels: 3,
							pools: [13],
							portNames: [],
							chanPorts: ['', '', ''],
						},
					]
				},
				// Create Port:
				'put /:zoneID/server/:serverID/port/:portID/channel/:channelID': (
					params
				): Q.PortInfo | ErrorResponse => {
					if (!quantelServer.ISAOptionHasBeenProvided) return noIsaSetupResponse
					quantelServer.port[params.portID] = {
						endOfData: 0,
						offset: -1,
						playing: false,
					}
					return {
						type: 'PortInfo',
						serverID: params.serverID,
						channelNo: params.channelID,
						audioOnly: false,
						portName: params.portID,
						portID: 2,
						assigned: true,
					}
				},
				// Release Port
				'delete /:zoneID/server/:serverID/port/:portID': (params): Q.ReleaseStatus | ErrorResponse => {
					if (!quantelServer.ISAOptionHasBeenProvided) return noIsaSetupResponse
					delete quantelServer.port[params.portID]
					return {
						type: 'ReleaseStatus',
						serverID: params.serverID,
						portName: params.portID,
						released: true,
						resetOnly: false, // ?
					}
				},
				// Port info:
				'get /:zoneID/server/:serverID/port/:portID': (params): Q.PortStatus | ErrorResponse => {
					if (!quantelServer.ISAOptionHasBeenProvided) return noIsaSetupResponse
					const port = quantelServer.port[params.portID]
					if (port) {
						let status: Q.PortStatus['status'] = 'unknown'

						if (port.playing) {
							// statuses.push('playing')
							status = 'playing&readyToPlay'
						} else {
							status = 'readyToPlay'
						}

						const portStatus: Q.PortStatus = {
							type: 'PortStatus',
							serverID: params.serverID,
							portName: 'fred',
							refTime: '14:47:31:00',
							portTime: '10:00:15:03',
							portID: params.portID,
							speed: 1,
							offset: port.offset,
							status: status,
							endOfData: port.endOfData || 0,
							framesUnused: 0,
							channels: [1],
							outputTime: '00:00:00:00',
							videoFormat: '', // ?
						}
						return portStatus
					} else {
						return {
							status: 404,
							message: `Not found. The port with identifier '${params.portID}' was not found.`,
							stack: '',
						}
					}
				},
				// Search for clip:
				'get /:zoneID/clip?Title=:title': searchClip,
				'get /:zoneID/clip?ClipGUID=:guid': searchClip,
				// get clip info:
				'get /:zoneID/clip/:clipID': (params): Q.ClipData | ErrorResponse => {
					if (!quantelServer.ISAOptionHasBeenProvided) return noIsaSetupResponse
					const clips = _.filter<Q.ClipData[]>(
						[
							{
								type: 'ClipData',
								Category: '',
								ClipID: 2,
								CloneId: 2,
								CloneZone: 1000,
								Completed: '2019-06-12T11:18:37.000Z',
								Created: '2019-06-12T11:18:37.000Z',
								Description: '',
								Destination: null,
								Expiry: null,
								Frames: '1000',
								HasEditData: 0,
								Inpoint: null,
								JobID: null,
								Modified: null,
								NumAudTracks: 1,
								Number: null,
								NumVidTracks: 1,
								Outpoint: null,
								Owner: '',
								PlaceHolder: false,
								PlayAspect: '',
								PoolID: 11,
								PublishedBy: '',
								Register: '0',
								Tape: '',
								Template: 0,
								Title: 'Test0',
								UnEdited: 1,
								PlayMode: '',
								MosActive: false,
								Division: '',
								AudioFormats: '73',
								VideoFormats: '90',
								ClipGUID: '0b124a741fa84c3eb7a707d13cc1f5aa',
								Protection: '',
								VDCPID: '',
								PublishCompleted: '2019-06-12T11:18:37.000Z',
							},
							{
								type: 'ClipData',
								Category: '',
								ClipID: 1337,
								CloneId: 1337,
								CloneZone: 1000,
								Completed: '2019-06-12T11:18:37.000Z',
								Created: '2019-06-12T11:18:37.000Z',
								Description: '',
								Destination: null,
								Expiry: null,
								Frames: '2000',
								HasEditData: 0,
								Inpoint: null,
								JobID: null,
								Modified: null,
								NumAudTracks: 1,
								Number: null,
								NumVidTracks: 1,
								Outpoint: null,
								Owner: '',
								PlaceHolder: false,
								PlayAspect: '',
								PoolID: 11,
								PublishedBy: '',
								Register: '0',
								Tape: '',
								Template: 0,
								Title: 'myClip0',
								UnEdited: 1,
								PlayMode: '',
								MosActive: false,
								Division: '',
								AudioFormats: '73',
								VideoFormats: '90',
								ClipGUID: 'abcdef872832832a2b932c97d9b2eb9',
								Protection: '',
								VDCPID: '',
								PublishCompleted: '2019-06-12T11:18:37.000Z',
							},
						],
						(clip) => {
							return clip.ClipID + '' === params.clipID
						}
					)
					if (clips[0]) return clips[0]

					return {
						status: 404,
						message: `Not found. A clip with identifier '${params.clipID}' was not found.`,
						stack: '',
					}
				},
				// get clip fragments:
				'get /:zoneID/clip/:clipID/fragments/:inOutPoints': () => {
					if (!quantelServer.ISAOptionHasBeenProvided) return noIsaSetupResponse
					return { __reroute: true }
				},
				'get /:zoneID/clip/:clipID/fragments': (params): Q.ServerFragments | ErrorResponse => {
					if (!quantelServer.ISAOptionHasBeenProvided) return noIsaSetupResponse
					const finish = params.clipID === '2' ? 1000 : params.clipID === '1337' ? 2000 : 0
					let inPoint = 0
					let outPoint = finish

					if (params.inOutPoints) {
						const m = params.inOutPoints.match(/(\d+)-(\d+)/)
						if (m) {
							inPoint = parseInt(m[1], 10)
							outPoint = Math.min(outPoint, parseInt(m[2], 10))
						}
					}

					outPoint = outPoint - inPoint

					if (finish) {
						const fragments: Q.ServerFragmentTypes[] = [
							{
								type: 'VideoFragment',
								trackNum: 0,
								start: 0,
								finish: outPoint,
								rushID: '1bb281cdcb7c491085c1b2fac53e4db1',
								format: 90,
								poolID: 11,
								poolFrame: 5,
								skew: 0,
								rushFrame: 0,
							},
							{
								type: 'EffectFragment',
								trackNum: 0,
								start: 0,
								finish: 20,
								effectID: 256,
							},
							{
								type: 'EffectFragment',
								trackNum: 0,
								start: 20,
								finish: outPoint,
								effectID: 256,
							},
							{
								type: 'AudioFragment',
								trackNum: 0,
								start: 0,
								finish: outPoint,
								rushID: '353a81482189451e8c56c5de72fdecac',
								format: 73,
								poolID: 11,
								poolFrame: 8960,
								skew: 0,
								rushFrame: 0,
							},
						]
						return {
							type: 'ServerFragments',
							clipID: 2,
							fragments: fragments,
						}
					}

					return {
						status: 404,
						message: `Not found. A clip with identifier '${params.clipID}' was not found.`,
						stack: '',
					}
				},
				// Load fragments onto port:
				'post /:zoneID/server/:serverID/port/:portID/fragments?offset=:offset': () => {
					if (!quantelServer.ISAOptionHasBeenProvided) return noIsaSetupResponse
					return { __reroute: true }
				},
				'post /:zoneID/server/:serverID/port/:portID/fragments': (params): Q.PortLoadStatus | ErrorResponse => {
					if (!quantelServer.ISAOptionHasBeenProvided) return noIsaSetupResponse
					if (params.portID === 'my_port') {
						if (!_.isArray(bodyData)) throw new Error('Bad body data')

						const fragments = bodyData as Q.ServerFragmentTypes[]
						let endOfData = 0
						_.each(fragments, (f) => {
							if (f.finish > endOfData) endOfData = f.finish
						})
						endOfData += parseInt(params.offset, 10) || 0

						quantelServer.port[params.portID].endOfData = endOfData

						return {
							type: 'PortLoadStatus',
							serverID: params.serverID,
							portName: 'my_port',
							offset: 0,
							status: 'unknown',
							fragmentCount: 4,
						} as Q.PortLoadStatus
					}
					return {
						status: 404,
						message: `Wrong port id '${params.portID}'`,
						stack: '',
					}
				},
				// Reset port (remove all fragments and reset playhead)
				'post /:zoneID/server/:serverID/port/:portID/reset': (params): Q.ReleaseStatus | ErrorResponse => {
					if (!quantelServer.ISAOptionHasBeenProvided) return noIsaSetupResponse
					// (?start=:start&finish=:finish)
					if (params.portID === 'my_port') {
						quantelServer.port[params.portID].endOfData = 0
						quantelServer.port[params.portID].offset = -1
						quantelServer.port[params.portID].playing = false
						return {
							type: 'ReleaseStatus',
							serverID: params.serverID,
							portName: 'my_port',
							released: false,
							resetOnly: true,
						}
					}
					return {
						status: 404,
						message: `Wrong port id '${params.portID}'`,
						stack: '',
					}
				},
				// Clear fragments from port (wipe, clear all fragments behind playhead):
				'delete /:zoneID/server/:serverID/port/:portID/fragments': (params): Q.WipeResult | ErrorResponse => {
					if (!quantelServer.ISAOptionHasBeenProvided) return noIsaSetupResponse
					// (?start=:start&finish=:finish)
					if (params.portID === 'my_port') {
						quantelServer.port[params.portID].endOfData = 0
						return {
							type: 'WipeResult',
							wiped: true,
							serverID: params.serverID,
							portName: 'fred',
						}
					}
					return {
						status: 404,
						message: `Wrong port id '${params.portID}'`,
						stack: '',
					}
				},
				// Prepare jump
				'put /:zoneID/server/:serverID/port/:portID/jump?offset=:offset': (
					params
				): Q.JumpResult | ErrorResponse => {
					if (!quantelServer.ISAOptionHasBeenProvided) return noIsaSetupResponse

					quantelServer.port[params.portID].jumpOffset = params.offset
					if (params.portID === 'my_port') {
						return {
							type: 'TriggeredJumpResult',
							success: true,
							offset: params.offset,
							serverID: params.serverID,
							portName: params.portID,
						}
					}

					return {
						status: 404,
						message: `Wrong port id '${params.portID}'`,
						stack: '',
					}
				},
				'post /:zoneID/server/:serverID/port/:portID/trigger/:trigger?offset=:offset': (
					params
				): Q.JumpResult | ErrorResponse => {
					if (!quantelServer.ISAOptionHasBeenProvided) return noIsaSetupResponse
					if (params.trigger.match(/START/) || params.trigger.match(/STOP/) || params.trigger.match(/JUMP/)) {
						quantelServer.port[params.portID].offset = params.offset
						if (params.portID === 'my_port') {
							return {
								type: 'TriggeredJumpResult',
								success: true,
								offset: quantelServer.port[params.portID].offset,
								serverID: params.serverID,
								portName: params.portID,
							}
						}

						return {
							status: 404,
							message: `Wrong port id '${params.portID}'`,
							stack: '',
						}
					}
					return {
						status: 404,
						message: `Unknown trigger '${params.trigger}'`,
						stack: '',
					}
				},
				// Trigger (start, stop, jump)
				'post /:zoneID/server/:serverID/port/:portID/trigger/:trigger': (
					params
				): Q.JumpResult | ErrorResponse => {
					if (!quantelServer.ISAOptionHasBeenProvided) return noIsaSetupResponse
					if (params.trigger.match(/START/) || params.trigger.match(/STOP/) || params.trigger.match(/JUMP/)) {
						if (params.trigger.match(/JUMP/)) {
							const jumpOffset = quantelServer.port[params.portID].jumpOffset
							if (jumpOffset) {
								quantelServer.port[params.portID].offset = jumpOffset
								delete quantelServer.port[params.portID].jumpOffset
							}
						} else if (params.trigger.match(/START/)) {
							quantelServer.port[params.portID].playing = true
						} else if (params.trigger.match(/STOP/)) {
							quantelServer.port[params.portID].playing = false
						}
						if (params.portID === 'my_port') {
							return {
								type: 'TriggeredJumpResult',
								success: true,
								offset: quantelServer.port[params.portID].offset,
								serverID: params.serverID,
								portName: params.portID,
							}
						}

						return {
							status: 404,
							message: `Wrong port id '${params.portID}'`,
							stack: '',
						}
					}
					return {
						status: 404,
						message: `Unknown trigger '${params.trigger}'`,
						stack: '',
					}
				},
				'get /': (): Q.ZoneInfo[] | ErrorResponse => {
					if (!quantelServer.ISAOptionHasBeenProvided) return noIsaSetupResponse
					return [
						{
							type: 'ZonePortal',
							zoneNumber: 1000,
							zoneName: 'default',
							isRemote: false,
						},
					]
				},
			})
			// console.log('got responding:', type, resource, body)

			resolve({
				statusCode: quantelServer.requestReturnsOK ? 200 : 500,
				// body: JSON.stringify(body)
				body: body,
			})
		} catch (e) {
			resolve({
				statusCode: 500,
				body: JSON.stringify({
					status: 500,
					message: e.toString(),
					stack: e.stack || '',
				}),
			})
		}
	})
}
