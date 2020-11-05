import * as atemState from './atem-state'
import * as casparcgConnection from './casparcg-connection'
import * as emberplusConnection from './emberplus-connection'
import * as emberplus from './emberplus'
import * as got from './got'
import * as hyperdeckConnection from './hyperdeck-connection'
import * as net from './net'
import * as osc from './osc'
import * as request from './request'
import * as requestPromiseNative from './request-promise-native'
import * as vConnection from './v-connection'
import * as ws from './ws'

// Note: Due to the nature of threadedClass, jests' normal module-mocks
// (just adding the mock-file in an adjecent __mocks__ directory)
// does not work properly and need to be set up like this..

export function setupAllMocks() {
	jest.mock('atem-state', () => atemState)
	jest.mock('casparcg-connection', () => casparcgConnection)
	jest.mock('emberplus-connection', () => emberplusConnection)
	jest.mock('emberplus', () => emberplus)
	jest.mock('got', () => got)
	jest.mock('hyperdeck-connection', () => hyperdeckConnection)
	jest.mock('net', () => net)
	jest.mock('osc', () => osc)
	jest.mock('request', () => request)
	jest.mock('request-promise-native', () => requestPromiseNative)
	jest.mock('v-connection', () => vConnection)
	jest.mock('ws', () => ws)
}
