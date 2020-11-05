// type Callback = (error: Error, result: any) => void

let _mockGet: (uri: string, options?: any) => Promise<any>
let _mockPost: (uri: string, options?: any) => Promise<any>
let _mockPut: (uri: string, options?: any) => Promise<any>
let _mockHead: (uri: string, options?: any) => Promise<any>
let _mockPatch: (uri: string, options?: any) => Promise<any>
let _mockDel: (uri: string, options?: any) => Promise<any>
let _mockDelete: (uri: string, options?: any) => Promise<any>

const request = {
	setMockGet: (fcn: (uri: string, options?: any) => Promise<any>) => {
		_mockGet = fcn
	},
	setMockPost: (fcn: (uri: string, options?: any) => Promise<any>) => {
		_mockPost = fcn
	},
	setMockPut: (fcn: (uri: string, options?: any) => Promise<any>) => {
		_mockPut = fcn
	},
	setMockHead: (fcn: (uri: string, options?: any) => Promise<any>) => {
		_mockHead = fcn
	},
	setMockPatch: (fcn: (uri: string, options?: any) => Promise<any>) => {
		_mockPatch = fcn
	},
	setMockDel: (fcn: (uri: string, options?: any) => Promise<any>) => {
		_mockDel = fcn
	},
	setMockDelete: (fcn: (uri: string, options?: any) => Promise<any>) => {
		_mockDelete = fcn
	},
	// ------------------
	get: (uri: string, options: any = {}) => {
		return _mockGet(uri, options.json)
	},
	post: (uri: string, options: any = {}) => {
		return _mockPost(uri, options.json)
	},
	put: (uri: string, options: any = {}) => {
		return _mockPut(uri, options.json)
	},
	head: (uri: string, options: any = {}) => {
		return _mockHead(uri, options.json)
	},
	patch: (uri: string, options: any = {}) => {
		return _mockPatch(uri, options.json)
	},
	del: (uri: string, options: any = {}) => {
		return _mockDel(uri, options.json)
	},
	delete: (uri: string, options: any = {}) => {
		return _mockDelete(uri, options.json)
	},
}

export = request
