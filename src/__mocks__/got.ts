// import * as orgGot from 'got'

// orgGot.default([
// 	asdf
// ])

// type Callback = (error: Error, result: any) => void

let _mockGet: (options: Options) => Promise<any>
let _mockPost: (options: Options) => Promise<any>
let _mockPut: (options: Options) => Promise<any>
let _mockHead: (options: Options) => Promise<any>
let _mockPatch: (options: Options) => Promise<any>
let _mockDel: (options: Options) => Promise<any>
let _mockDelete: (options: Options) => Promise<any>

interface Options {
	url: string
	method: 'POST' | 'GET' | 'PUT' | 'DELETE'
	json?: Record<string, unknown>
	timeout: number
	responseType: string // 'json'
}
const gotMethods = {
	// mock functions:
	setMockGet: (fcn: (options: Options) => Promise<any>) => {
		_mockGet = fcn
	},
	setMockPost: (fcn: (options: Options) => Promise<any>) => {
		_mockPost = fcn
	},
	setMockPut: (fcn: (options: Options) => Promise<any>) => {
		_mockPut = fcn
	},
	setMockHead: (fcn: (options: Options) => Promise<any>) => {
		_mockHead = fcn
	},
	setMockPatch: (fcn: (options: Options) => Promise<any>) => {
		_mockPatch = fcn
	},
	setMockDel: (fcn: (options: Options) => Promise<any>) => {
		_mockDel = fcn
	},
	setMockDelete: (fcn: (options: Options) => Promise<any>) => {
		_mockDelete = fcn
	},
	// ------------------
	// default: (options: Options) => {

	// },
	get: (options: Options) => {
		return _mockGet(options)
	},
	post: (options: Options) => {
		return _mockPost(options)
	},
	put: (options: Options) => {
		return _mockPut(options)
	},
	head: (options: Options) => {
		return _mockHead(options)
	},
	patch: (options: Options) => {
		return _mockPatch(options)
	},
	del: (options: Options) => {
		return _mockDel(options)
	},
	delete: (options: Options) => {
		return _mockDelete(options)
	},
}
const got: any = (options: Options) => {
	if (options.method === 'POST') return gotMethods.post(options)
	else if (options.method === 'GET') return gotMethods.get(options)
	else if (options.method === 'PUT') return gotMethods.put(options)
	else if (options.method === 'DELETE') return gotMethods.delete(options)
	else return 'ERROR: method not supported'
}
Object.keys(gotMethods).forEach((key) => {
	got[key] = gotMethods[key]
})
export = got
