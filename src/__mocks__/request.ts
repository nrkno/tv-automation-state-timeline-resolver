type Callback = (error: Error, result: any) => void

let _mockGet: (uri: string, options?: any, callback?: Callback) => void
let _mockPost: (uri: string, options?: any, callback?: Callback) => void
let _mockPut: (uri: string, options?: any, callback?: Callback) => void
let _mockHead: (uri: string, options?: any, callback?: Callback) => void
let _mockPatch: (uri: string, options?: any, callback?: Callback) => void
let _mockDel: (uri: string, options?: any, callback?: Callback) => void
let _mockDelete: (uri: string, options?: any, callback?: Callback) => void

const request = {
	setMockGet: (fcn: (uri: string, options?: any, callback?: Callback) => void) => {
		_mockGet = fcn
	},
	setMockPost: (fcn: (uri: string, options?: any, callback?: Callback) => void) => {
		_mockPost = fcn
	},
	setMockPut: (fcn: (uri: string, options?: any, callback?: Callback) => void) => {
		_mockPut = fcn
	},
	setMockHead: (fcn: (uri: string, options?: any, callback?: Callback) => void) => {
		_mockHead = fcn
	},
	setMockPatch: (fcn: (uri: string, options?: any, callback?: Callback) => void) => {
		_mockPatch = fcn
	},
	setMockDel: (fcn: (uri: string, options?: any, callback?: Callback) => void) => {
		_mockDel = fcn
	},
	setMockDelete: (fcn: (uri: string, options?: any, callback?: Callback) => void) => {
		_mockDelete = fcn
	},
	// ------------------
	get: (uri: string, options: any = {}, callback?: Callback) => {
		_mockGet(uri, options.json, callback)
	},
	post: (uri: string, options: any = {}, callback?: Callback) => {
		_mockPost(uri, options.json, callback)
	},
	put: (uri: string, options: any = {}, callback?: Callback) => {
		_mockPut(uri, options.json, callback)
	},
	head: (uri: string, options: any = {}, callback?: Callback) => {
		_mockHead(uri, options.json, callback)
	},
	patch: (uri: string, options: any = {}, callback?: Callback) => {
		_mockPatch(uri, options.json, callback)
	},
	del: (uri: string, options: any = {}, callback?: Callback) => {
		_mockDel(uri, options.json, callback)
	},
	delete: (uri: string, options: any = {}, callback?: Callback) => {
		_mockDelete(uri, options.json, callback)
	},
}
export = request
