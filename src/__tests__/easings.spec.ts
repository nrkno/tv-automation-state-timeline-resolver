import { Easing } from '../easings'

describe('easings', () => {
	const easings = {
		Linear: ['None'],
		Quadratic: ['In', 'Out', 'InOut'],
		Cubic: ['In', 'Out', 'InOut'],
		Quartic: ['In', 'Out', 'InOut'],
		Quintic: ['In', 'Out', 'InOut'],
		Sinusoidal: ['In', 'Out', 'InOut'],
		Exponential: ['In', 'Out', 'InOut'],
		Circular: ['In', 'Out', 'InOut'],
		Elastic: ['In', 'Out', 'InOut'],
		Back: ['In', 'Out', 'InOut'],
		Bounce: ['In', 'Out', 'InOut'],
	}

	Object.entries(easings).forEach((a) => {
		const easingName = a[0]
		const subTypes = a[1]

		subTypes.forEach((subType) => {
			test(`Easing ${easingName}: ${subType}`, () => {
				const easingType = Easing[easingName]
				expect(easingType).toBeTruthy()

				const easing = easingType[subType]
				expect(easing).toBeTruthy()

				expect(easing(0)).toBeCloseTo(0, 4)
				expect(easing(1)).toBeCloseTo(1, 4)

				const result = [0, 0.1, 0.2, 0.3, 0.5, 0.75, 0.97, 1].map((v) => {
					// Rounding because we're not interested in floating-point exact
					return Math.floor(easing(v) * 10000) / 10000
				})

				expect(result).toMatchSnapshot()
			})
		})
	})
})
