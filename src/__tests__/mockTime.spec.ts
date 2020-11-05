import { MockTime } from './mockTime'

describe('mockTime', () => {
	test('mockTime sync', () => {
		const mockTime = new MockTime()
		mockTime.init()
		expect(mockTime.now).toEqual(10000)
		expect(mockTime.now).toEqual(10000)

		mockTime.advanceTime(100)
		expect(mockTime.now).toEqual(10100)
		mockTime.advanceTimeTo(12000)
		expect(mockTime.now).toEqual(12000)
		expect(() => {
			mockTime.advanceTimeTo(11000)
		}).toThrowError()
	})
	test('mockTimeAsync', async (done) => {
		const mockTime = new MockTime()
		mockTime.init()
		expect(mockTime.now).toEqual(10000)
		expect(mockTime.now).toEqual(10000)

		await mockTime.advanceTimeTicks(100)
		expect(mockTime.now).toEqual(10100)
		await mockTime.advanceTimeToTicks(12000)
		expect(mockTime.now).toEqual(12000)
		mockTime.advanceTimeToTicks(11000).catch(() => {
			done()
		})
	})
})
