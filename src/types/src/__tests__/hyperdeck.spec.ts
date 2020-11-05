import { TransportStatus as UpstreamTransportStatus } from 'hyperdeck-connection'
import { TransportStatus as LocalTransportStatus } from '../'

describe('Hyperdeck types', () => {
	test('Hyperdeck types: TransportStatus', async () => {
		expect(LocalTransportStatus).toEqual(UpstreamTransportStatus)
	})
})
