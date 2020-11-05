import { DeviceStatus, StatusCode, Device, IDevice } from './device'
import {
	DeviceType,
	TimelineContentTypeHTTP,
	HTTPWatcherOptions,
	DeviceOptionsHTTPpWatcher,
	Mappings,
} from '../types/src'
import * as request from 'request'

import { TimelineState } from 'superfly-timeline'

export interface DeviceOptionsHTTPWatcherInternal extends DeviceOptionsHTTPpWatcher {
	options: DeviceOptionsHTTPpWatcher['options']
}

/**
 * This is a HTTPWatcherDevice, requests a uri on a regular interval and watches
 * it's response.
 */
export class HTTPWatcherDevice extends Device implements IDevice {
	private uri?: string
	private httpMethod: TimelineContentTypeHTTP
	private expectedHttpResponse: number | undefined
	private keyword: string | undefined
	private intervalTime: number
	private interval: NodeJS.Timer | undefined
	private status: StatusCode = StatusCode.UNKNOWN
	private statusReason: string | undefined
	constructor(
		deviceId: string,
		deviceOptions: DeviceOptionsHTTPWatcherInternal,
		getCurrentTime: () => Promise<number>
	) {
		super(deviceId, deviceOptions, getCurrentTime)
		const opts = deviceOptions.options || {}
		switch (opts.httpMethod) {
			case 'post':
				this.httpMethod = TimelineContentTypeHTTP.POST
				break
			case 'delete':
				this.httpMethod = TimelineContentTypeHTTP.DELETE
				break
			case 'put':
				this.httpMethod = TimelineContentTypeHTTP.PUT
				break
			case 'get':
			case undefined:
			default:
				this.httpMethod = TimelineContentTypeHTTP.GET
				break
		}

		this.expectedHttpResponse = Number(opts.expectedHttpResponse) || undefined
		this.keyword = opts.keyword
		this.intervalTime = Math.max(Number(opts.interval) || 1000, 1000)
		this.uri = opts.uri
	}

	onInterval() {
		if (!this.uri) {
			this._setStatus(StatusCode.BAD, 'URI not set')
			return
		}
		const reqMethod = request[this.httpMethod]
		if (reqMethod) {
			reqMethod(this.uri, {}, this.handleResponse.bind(this))
		} else {
			this._setStatus(StatusCode.BAD, `Bad request method: "${this.httpMethod}"`)
		}
	}
	stopInterval() {
		if (this.interval) {
			clearInterval(this.interval)
			this.interval = undefined
		}
	}
	startInterval() {
		this.stopInterval()
		this.interval = setInterval(this.onInterval.bind(this), this.intervalTime)
	}

	handleResponse(error: any, response: request.Response, body: any) {
		if (error) {
			this._setStatus(StatusCode.BAD, error.toString() || 'Unknown')
		} else if (this.expectedHttpResponse && this.expectedHttpResponse !== response.statusCode) {
			this._setStatus(
				StatusCode.BAD,
				`Expected status code ${this.expectedHttpResponse}, got ${response.statusCode}`
			)
		} else if (this.keyword && body && (body.toString() || '').indexOf(this.keyword) === -1) {
			this._setStatus(StatusCode.BAD, `Expected keyword "${this.keyword}" not found`)
		} else {
			this._setStatus(StatusCode.GOOD)
		}
	}

	init(_initOptions: HTTPWatcherOptions): Promise<boolean> {
		this.startInterval()

		return Promise.resolve(true)
	}
	/** Called by the Conductor a bit before a .handleState is called */
	prepareForHandleState(_newStateTime: number) {
		// NOP
	}
	handleState(newState: TimelineState, newMappings: Mappings) {
		super.onHandleState(newState, newMappings)
		// NOP
	}
	clearFuture(_clearAfterTime: number) {
		// NOP
	}
	getStatus(): DeviceStatus {
		const s: DeviceStatus = {
			statusCode: this.status,
			active: true, // since this is not using any mappings, it's considered to be always active
		}
		if (this.statusReason) s.messages = [this.statusReason]
		return s
	}
	terminate(): Promise<boolean> {
		this.stopInterval()

		return Promise.resolve(true)
	}
	private _setStatus(status: StatusCode, reason?: string) {
		if (this.status !== status || this.statusReason !== reason) {
			this.status = status
			this.statusReason = reason

			this.emit('connectionChanged', this.getStatus())
		}
	}

	get canConnect(): boolean {
		return false
	}
	get connected(): boolean {
		return false
	}
	get deviceType() {
		return DeviceType.HTTPWATCHER
	}
	get deviceName(): string {
		return 'HTTP-Watch ' + this.deviceId
	}
}
