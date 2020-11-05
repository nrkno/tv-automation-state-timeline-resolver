/**
 * Just a wrapper to :any type, to be used in tests only
 */
export function getMockCall<T>(fcn: jest.Mock<T>, callIndex: number, paramIndex: number): any {
	return fcn.mock.calls[callIndex][paramIndex]
}

// Excend jest.expect in functionality and typings
expect.extend({
	toBeCloseTo(received: number, target: number, diff: number) {
		const pass = Math.abs(received - target) <= diff
		return {
			message: () => `expected ${received} to be close to ${target} (within ${diff})`,
			pass: pass,
		}
	},
})
declare global {
	/* eslint-disable @typescript-eslint/no-namespace */
	namespace jest {
		interface Expect {
			toBeCloseTo(target: number, diff: number): any
		}
	}
}
