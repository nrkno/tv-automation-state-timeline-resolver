import { Conductor, DeviceType } from '../src/index' // from 'timeline-state-resolver'
import { TimelineContentTypeCasparCg, TSRTimelineObj } from '../src/types/src' // from 'timeline-state-resolver-types'

// Initialize TSR:
const tsr = new Conductor()
tsr.on('info', (e) => console.log('info', e))
tsr.on('warning', (e) => console.log('warning', e))
tsr.on('error', (e) => console.log('error', e))
tsr.on('debug', (deviceId, cmd) => console.log('debug', deviceId, cmd))
// tsr.on('timelineCallback', e => console.log('timelineCallback', e))

const a = async function () {
	await tsr.init()

	await tsr.addDevice('casparcg0', {
		type: DeviceType.CASPARCG,
		options: {
			host: '127.0.0.1',
			// port: 5250
		},
	})

	// Setup mappings from layers to outputs:
	const mappings = {
		layer0: {
			device: DeviceType.CASPARCG,
			deviceId: 'casparcg0',
			channel: 1,
			layer: 10,
		},
	}
	// Set a new timeline:
	const video0: TSRTimelineObj = {
		id: 'video0',
		enable: {
			start: Date.now(),
			duration: 60 * 1000,
		},
		layer: 'layer0',
		content: {
			deviceType: DeviceType.CASPARCG,
			type: TimelineContentTypeCasparCg.MEDIA,

			file: 'AMB',
			loop: true,

			// playing: false,
			// pauseTime: Date.now()
		},
	}
	console.log('set timeline')
	tsr.setTimelineAndMappings([video0], mappings)
}
a().catch((e) => console.log(e))
