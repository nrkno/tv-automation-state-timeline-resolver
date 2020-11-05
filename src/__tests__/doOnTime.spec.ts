import { MockTime } from './mockTime'
import { DoOnTime, SendMode } from '../doOnTime'

describe('DoOnTime', () => {
	const mockTime = new MockTime()
	beforeAll(() => {
		mockTime.mockDateNow()
	})
	beforeEach(() => {
		mockTime.init()
	})

	test('Burst', async () => {
		const d = new DoOnTime(() => {
			return mockTime.now
		}, SendMode.BURST)
		const onError = jest.fn((...args) => {
			console.log(...args)
		})
		const onSlowCommand = jest.fn()

		d.on('error', onError)
		d.on('slowCommand', onSlowCommand)
		expect(Date.now()).toEqual(10000)

		const f = jest.fn()

		d.queue(10100, undefined, () => {
			f('a', Date.now())
		})
		d.queue(10300, undefined, () => {
			f('b', Date.now())
		})
		d.queue(10200, undefined, () => {
			f('c', Date.now())
		})

		expect(f).toHaveBeenCalledTimes(0)

		await mockTime.advanceTimeToTicks(10090)

		expect(f).toHaveBeenCalledTimes(0)

		expect(d.getQueue()).toHaveLength(3)

		await mockTime.advanceTimeToTicks(12000)

		expect(onError).toHaveBeenCalledTimes(0)
		expect(onSlowCommand).toHaveBeenCalledTimes(0)

		expect(f).toHaveBeenCalledTimes(3)
		expect(f).toHaveBeenNthCalledWith(1, 'a', 10100)
		expect(f).toHaveBeenNthCalledWith(2, 'c', 10200)
		expect(f).toHaveBeenNthCalledWith(3, 'b', 10300)

		d.dispose()
	})
	test('In Order', async () => {
		const d = new DoOnTime(
			() => {
				return mockTime.now
			},
			SendMode.IN_ORDER,
			{
				limitSlowSentCommand: 50,
			}
		)
		const onError = jest.fn((...args) => {
			console.log(...args)
		})
		const onSlowCommand = jest.fn()
		d.on('error', onError)
		d.on('slowCommand', onSlowCommand)
		expect(Date.now()).toEqual(10000)

		const f = jest.fn()

		// Default queue:
		d.queue(10100, undefined, async () => {
			f('a', Date.now())
			await wait(1000)
		})
		d.queue(10300, undefined, async () => {
			f('b', Date.now())
			await wait(1000)
		})
		d.queue(10200, undefined, async () => {
			f('c', Date.now())
			await wait(1000)
		})

		await mockTime.advanceTimeToTicks(15000)

		expect(onError).toHaveBeenCalledTimes(0)
		expect(onSlowCommand).toHaveBeenCalledTimes(2)

		expect(f).toHaveBeenCalledTimes(3)
		expect(f).toHaveBeenNthCalledWith(1, 'a', 10100)
		expect(f).toHaveBeenNthCalledWith(2, 'c', 11105)
		expect(f).toHaveBeenNthCalledWith(3, 'b', 12105)

		d.dispose()
	})
	test('In Order, queues', async () => {
		const d = new DoOnTime(
			() => {
				return mockTime.now
			},
			SendMode.IN_ORDER,
			{
				limitSlowSentCommand: 50,
			}
		)
		const onError = jest.fn((...args) => {
			console.log(...args)
		})
		const onSlowCommand = jest.fn()
		d.on('error', onError)
		d.on('slowCommand', onSlowCommand)
		expect(Date.now()).toEqual(10000)

		const f = jest.fn()

		d.queue(10100, 'queue_a', async () => {
			f('a', Date.now())
			await wait(1000)
		})
		d.queue(10300, 'queue_a', async () => {
			f('b', Date.now())
			await wait(1000)
		})
		d.queue(10200, 'queue_a', async () => {
			f('c', Date.now())
			await wait(1000)
		})

		d.queue(10100, 'queue_b', async () => {
			f('a', Date.now())
			await wait(1000)
		})
		d.queue(10300, 'queue_b', async () => {
			f('b', Date.now())
			await wait(1000)
		})
		d.queue(10200, 'queue_b', async () => {
			f('c', Date.now())
			await wait(1000)
		})

		await mockTime.advanceTimeToTicks(15000)

		expect(onError).toHaveBeenCalledTimes(0)
		expect(onSlowCommand).toHaveBeenCalledTimes(4)

		expect(f).toHaveBeenCalledTimes(6)
		expect(f).toHaveBeenNthCalledWith(1, 'a', 10100)
		expect(f).toHaveBeenNthCalledWith(2, 'a', 10100)

		expect(f).toHaveBeenNthCalledWith(3, 'c', 11105)
		expect(f).toHaveBeenNthCalledWith(4, 'c', 11105)

		expect(f).toHaveBeenNthCalledWith(5, 'b', 12105)
		expect(f).toHaveBeenNthCalledWith(6, 'b', 12105)

		d.dispose()
	})
})
function wait(time = 1) {
	return new Promise((resolve) => {
		setTimeout(resolve, time)
	})
}
