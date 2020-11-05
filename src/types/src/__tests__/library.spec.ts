// These imports are pointed to what external libraries will import
import { DeviceType as Types_DeviceType, TSRTimeline, TimelineObjEmpty } from '../../dist'

describe('Usage of library', () => {
	// These tests test that the library can be imported and used by the library consumers.

	// Note that the command 'yarn types-build' must have been run for these tests to pass
	test('types', () => {
		expect(Types_DeviceType.ATEM).toEqual(2)

		// Expect these types to work:
		const obj: TimelineObjEmpty = {
			id: 'myId',
			enable: {
				start: 0,
				duration: 42,
			},
			layer: 'myLayer',
			content: {
				deviceType: Types_DeviceType.ABSTRACT,
				type: 'empty',
			},
			classes: [],
		}
		const tl: TSRTimeline = [obj]
		expect(tl[0].content.deviceType).toEqual(0)
	})
})
