import * as request from '../../__mocks__/request'
// const orgSetTimeout = setTimeout

/*
	This file mocks the server-side part of VMIX
*/

const vmixMockState = `<vmix>
<version>21.0.0.55</version>
<edition>HD</edition>
<preset>C:\\Users\\server\\AppData\\Roaming\\last.vmix</preset>
<inputs>
<input key="ca9bc59f-f698-41fe-b17d-1e1743cfee88" number="1" type="Capture" title="Cam 1" state="Running" position="0" duration="0" loop="False" muted="False" volume="100" balance="0" solo="False" audiobusses="M" meterF1="0.03034842" meterF2="0.03034842"></input>
<input key="1a50938d-c653-4eae-bc4c-24d9c12fa773" number="2" type="Capture" title="Cam 2" state="Running" position="0" duration="0" loop="False" muted="True" volume="100" balance="0" solo="False" audiobusses="M,C" meterF1="0.0007324442" meterF2="0.0007629627"></input>
</inputs>
<overlays>
<overlay number="1"/>
<overlay number="2"/>
<overlay number="3"/>
<overlay number="4"/>
<overlay number="5"/>
<overlay number="6"/>
</overlays>
<preview>2</preview>
<active>1</active>
<fadeToBlack>False</fadeToBlack>
<transitions>
<transition number="1" effect="Fade" duration="500"/>
<transition number="2" effect="Merge" duration="1000"/>
<transition number="3" effect="Wipe" duration="1000"/>
<transition number="4" effect="CubeZoom" duration="1000"/>
</transitions>
<recording duration="25519">True</recording>
<external>True</external>
<streaming>True</streaming>
<playList>False</playList>
<multiCorder>False</multiCorder>
<fullscreen>False</fullscreen>
<audio>
<master volume="100" muted="False" meterF1="0.04211706" meterF2="0.04211706" headphonesVolume="74.80521"/>
</audio>
</vmix>`

export function setupVmixMock() {
	const vmixServer: VmixServerMockOptions = {
		// add any vmix mocking of server-state here
		repliesAreGood: true,
		serverIsUp: true,
	}

	const onRequest = jest.fn((_type: string, _url: string) => {
		// console.log('onRequest', type, url)
	})

	const onRequestRaw = jest.fn((type: string, url: string) => {
		onRequest(type, url)
	})

	const onGet = jest.fn((url, options, cb) => handleRequest(vmixServer, onRequestRaw, 'get', url, options, cb))
	const onPost = jest.fn((url, options, cb) => handleRequest(vmixServer, onRequestRaw, 'post', url, options, cb))
	const onPut = jest.fn((url, options, cb) => handleRequest(vmixServer, onRequestRaw, 'put', url, options, cb))
	const onHead = jest.fn((url, options, cb) => handleRequest(vmixServer, onRequestRaw, 'head', url, options, cb))
	const onPatch = jest.fn((url, options, cb) => handleRequest(vmixServer, onRequestRaw, 'patch', url, options, cb))
	const onDel = jest.fn((url, options, cb) => handleRequest(vmixServer, onRequestRaw, 'del', url, options, cb))
	const onDelete = jest.fn((url, options, cb) => handleRequest(vmixServer, onRequestRaw, 'delete', url, options, cb))

	request.setMockGet(onGet)
	request.setMockPost(onPost)
	request.setMockPut(onPut)
	request.setMockHead(onHead)
	request.setMockPatch(onPatch)
	request.setMockDel(onDel)
	request.setMockDelete(onDelete)

	return {
		vmixServer,
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
interface VmixServerMockOptions {
	repliesAreGood: boolean
	serverIsUp: boolean
}

function urlRoute(
	requestType: string,
	url: string,
	routes: { [route: string]: (params: Params) => Record<string, unknown> }
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
	vmixServer: VmixServerMockOptions,
	triggerFcn: (type: string, url: string) => void,
	type: string,
	url: string,
	_bodyData: any,
	callback: (err: Error | null, value?: any) => void
) {
	process.nextTick(() => {
		triggerFcn(type, url)

		if (!vmixServer.serverIsUp) {
			callback(new Error(), null)
		}

		try {
			const resource = (url.match(/http:\/\/[^/]+(.*)/) || [])[1] || ''

			let body: Record<string, unknown> = {}

			if (!vmixServer.repliesAreGood) throw new Error('Bad mock reply')

			body = urlRoute(type, resource, {
				'get /api': () => {
					return {
						response: vmixMockState,
					}
				},
			})

			callback(null, {
				statusCode: 200,
				body: body['response'],
			})
		} catch (e) {
			callback(null, {
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
