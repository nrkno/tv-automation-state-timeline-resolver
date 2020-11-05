import {
	createMSE as orgCreateMSE,
	MSE,
	VRundown,
	VizEngine,
	VProfile,
	VShow,
	VPlaylist,
	VTemplate,
	InternalElement,
	ExternalElement,
	VElement,
} from 'v-connection'
import { EventEmitter } from 'events'
import { CommandResult } from 'v-connection/dist/msehttp'
import { PepResponse } from 'v-connection/dist/peptalk'
import _ = require('underscore')

const mockMSEs: MSEMock[] = []

export const createMSE: typeof orgCreateMSE = function createMSE0(
	hostname: string,
	restPort?: number,
	wsPort?: number,
	resthost?: string
): MSE {
	const mse = new MSEMock(hostname, restPort, wsPort, resthost)

	mockMSEs.push(mse)

	return mse
}

export function getMockMSEs() {
	return mockMSEs
}

export class MSEMock extends EventEmitter implements MSE {
	public readonly hostname: string
	public readonly restPort: number
	public readonly wsPort: number
	public readonly resthost: string

	private profiles: { [profileName: string]: VProfile } = {}
	private rundowns: { [playlistId: string]: VRundownMock } = {}

	constructor(hostname: string, restPort?: number, wsPort?: number, resthost?: string) {
		super()
		this.hostname = hostname
		this.restPort = restPort || 80
		this.wsPort = wsPort || 80
		this.resthost = resthost || hostname
	}
	async getRundowns(): Promise<VRundownMock[]> {
		return _.values(this.rundowns)
	}
	async getRundown(playlistId: string): Promise<VRundownMock> {
		const rundown = this.rundowns[playlistId]
		if (!rundown) throw new Error('Rundown not found')

		return rundown
	}
	async getEngines(): Promise<VizEngine[]> {
		return []
	}
	async listProfiles(): Promise<string[]> {
		return _.keys(this.profiles) // ?
	}
	async getProfile(profileName: string): Promise<VProfile> {
		return {
			name: profileName,
			execution_groups: {},
		}
	}
	async listShows(): Promise<string[]> {
		return []
	}
	async getShow(showName: string): Promise<VShow> {
		return {
			id: 'mockshowid_' + showName,
		}
	}
	async listPlaylists(): Promise<string[]> {
		return []
	}
	async getPlaylist(playlistName: string): Promise<VPlaylist> {
		return {
			name: playlistName,
			// description?: string
			profile: '',
			active_profile: {
				// value?: string
			},
		}
	}
	async createRundown(
		showID: string,
		profile: string,
		playlistId?: string,
		description?: string
	): Promise<VRundownMock> {
		if (!playlistId) playlistId = 'mockrandomPlaylist' + Date.now()
		const rundown = new VRundownMock(showID, profile, playlistId, description)

		this.rundowns[playlistId] = rundown

		return rundown
	}
	async deleteRundown(rundown: VRundownMock): Promise<boolean> {
		if (this.rundowns[rundown.playlist]) {
			delete this.rundowns[rundown.playlist]
			return true
		}
		return false
	}
	async createProfile(profileName: string, _profileDetailsTbc: any): Promise<VProfile> {
		const profile: VProfile = {
			name: profileName,
			execution_groups: {},
		}
		this.profiles[profileName] = profile

		return profile
	}
	async deleteProfile(profileName: string): Promise<boolean> {
		if (this.profiles[profileName]) {
			delete this.profiles[profileName]
			return true
		}
		return false
	}
	async ping(): Promise<CommandResult> {
		return {
			path: 'mock',
			// body?: string
			status: 200,
			response: 'mock',
		}
	}
	timeout(t?: number): number {
		throw new Error('Not implemented')
		return t || 0
	}
	async close(): Promise<boolean> {
		return true
	}
	// on (event: 'connected', listener: () => void): this
	// on (event: 'disconnected', listener: (err?: Error) => void): this

	getMockRundowns() {
		return (_.values(this.rundowns) as any) as VRundownMocked[]
	}
	mockSetConnected() {
		this.emit('connected')
	}
	mockSetDisconnected() {
		this.emit('disconnected')
	}
}

type MockClass<T> = {
	[K in keyof T]: jest.Mock<T[K]>
}
export type VRundownMocked = MockClass<VRundown>
export class VRundownMock implements VRundown {
	private elements: { [key: string]: VElement } = {}
	private _isActive = false
	constructor(
		public readonly show: string,
		public readonly profile: string,
		public readonly playlist: string,
		public readonly description?: string
	) {
		// Hack: replace methods with jest-ified ones
		_.each(Object.getOwnPropertyNames(VRundownMock.prototype), (key) => {
			if (key !== 'prototype') {
				if (typeof this[key] === 'function') {
					this[key] = jest.fn(VRundownMock.prototype[key])
				}
			}
		})
	}

	async listTemplates(): Promise<string[]> {
		return []
	}
	async getTemplate(templateName: string): Promise<VTemplate> {
		return {
			name: templateName,
			defaultAlternatives: {}, // any
		}
	}
	async createElement(vcpid: number, channel?: string, alias?: string): Promise<ExternalElement>
	async createElement(
		templateName: string,
		elementName: string,
		textFields: string[],
		channel?: string
	): Promise<InternalElement>
	async createElement(
		templateNameOrVcpid: any,
		elementNameOrChannel?: any,
		textFieldsOrAlias?: any,
		channel?: string
	): Promise<ExternalElement | InternalElement> {
		if (typeof templateNameOrVcpid === 'number') {
			const vcpid = templateNameOrVcpid
			const channel = elementNameOrChannel
			// const alias = textFieldsOrAlias

			const el: ExternalElement = {
				channel: channel,
				vcpid: '' + vcpid,
				// available?: string,
				// is_loading?: string,
				// loaded?: string,
				// take_count?: string,
				// exists?: string,
				// error?: string,
				// name?: string
			}

			this.elements['' + vcpid] = el
			return el
		} else {
			const templateName = templateNameOrVcpid
			const elementName = elementNameOrChannel
			const textFields = textFieldsOrAlias

			const data: any = {}
			_.each(textFields, (val, key) => {
				data['v' + key] = val
			})
			const el: InternalElement = {
				channel: channel,
				name: elementName,
				template: templateName,
				data: data,
			}
			this.elements[elementName] = el
			return el
		}
	}
	async listElements(): Promise<Array<string | number>> {
		return []
	}
	async getElement(elementName: string | number): Promise<VElement> {
		return this.elements[elementName]
	}
	async deleteElement(elementName: string | number): Promise<PepResponse> {
		delete this.elements[elementName]

		return {
			id: '*',
			status: 'ok',
			// sent?: string;
			body: 'mock',
		}
	}
	async cue(_elementName: string | number): Promise<CommandResult> {
		return { path: '', status: 200, response: 'mock' }
	}
	async take(_elementName: string | number): Promise<CommandResult> {
		return { path: '', status: 200, response: 'mock' }
	}
	async continue(_elementName: string | number): Promise<CommandResult> {
		return { path: '', status: 200, response: 'mock' }
	}
	async continueReverse(_elementName: string | number): Promise<CommandResult> {
		return { path: '', status: 200, response: 'mock' }
	}
	async out(_elementName: string | number): Promise<CommandResult> {
		return { path: '', status: 200, response: 'mock' }
	}
	async initialize(_elementName: number): Promise<CommandResult> {
		const el = this.elements[_elementName]
		if (!el) throw new Error('Element not found')

		// available?: string,
		el.is_loading = 'no'
		el.loaded = '1.00'
		el.available = '1.00'
		// take_count?: string,
		// exists?: string,
		// error?: string,
		// name?: string

		return { path: '', status: 200, response: 'mock' }
	}
	async activate(_load?: boolean): Promise<CommandResult> {
		this._isActive = true
		return { path: '', status: 200, response: 'mock' }
	}
	async deactivate(): Promise<CommandResult> {
		this._isActive = false
		return { path: '', status: 200, response: 'mock' }
	}
	async cleanup(): Promise<CommandResult> {
		return { path: '', status: 200, response: 'mock' }
	}
	async purge(): Promise<PepResponse> {
		return { id: '*', status: 'ok', body: 'mock' }
	}
	async isActive(): Promise<boolean> {
		return this._isActive
	}
}
