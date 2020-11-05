import { OSCEasingType } from '..'
import { Easing } from '../../../easings'

describe('OSC', () => {
	test('OSC Easing type', () => {
		// Make sure OSCEasingType type reflects the original Easing class

		const checkType = (typeVar: OSCEasingType) => {
			const orgVar: keyof typeof Easing = typeVar

			const typeVar2: OSCEasingType = orgVar

			return typeVar2
		}

		checkType('Linear')

		type OrgEasing = keyof typeof Easing

		// Make sure the typings work
		const orgVarLinear: OrgEasing = 'Linear'
		const orgVarQuadratic: OrgEasing = 'Quadratic'
		const orgVarCubic: OrgEasing = 'Cubic'
		const orgVarQuartic: OrgEasing = 'Quartic'
		const orgVarQuintic: OrgEasing = 'Quintic'
		const orgVarSinusoidal: OrgEasing = 'Sinusoidal'
		const orgVarExponential: OrgEasing = 'Exponential'
		const orgVarCircular: OrgEasing = 'Circular'
		const orgVarElastic: OrgEasing = 'Elastic'
		const orgVarBack: OrgEasing = 'Back'
		const orgVarBounce: OrgEasing = 'Bounce'

		const typeVarLinear: OSCEasingType = orgVarLinear
		const typeVarQuadratic: OSCEasingType = orgVarQuadratic
		const typeVarCubic: OSCEasingType = orgVarCubic
		const typeVarQuartic: OSCEasingType = orgVarQuartic
		const typeVarQuintic: OSCEasingType = orgVarQuintic
		const typeVarSinusoidal: OSCEasingType = orgVarSinusoidal
		const typeVarExponential: OSCEasingType = orgVarExponential
		const typeVarCircular: OSCEasingType = orgVarCircular
		const typeVarElastic: OSCEasingType = orgVarElastic
		const typeVarBack: OSCEasingType = orgVarBack
		const typeVarBounce: OSCEasingType = orgVarBounce

		expect(typeVarLinear).toBeTruthy()
		expect(typeVarQuadratic).toBeTruthy()
		expect(typeVarCubic).toBeTruthy()
		expect(typeVarQuartic).toBeTruthy()
		expect(typeVarQuintic).toBeTruthy()
		expect(typeVarSinusoidal).toBeTruthy()
		expect(typeVarExponential).toBeTruthy()
		expect(typeVarCircular).toBeTruthy()
		expect(typeVarElastic).toBeTruthy()
		expect(typeVarBack).toBeTruthy()
		expect(typeVarBounce).toBeTruthy()
	})
})
