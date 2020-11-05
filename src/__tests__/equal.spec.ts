import _ from 'underscore'
import { getDiff } from '../lib'

describe('equal', () => {
	/*
	Note: These test cases are based upon the _.isEqual tests from underscore in
	https://github.com/jashkenas/underscore/blob/master/test/objects.js
	*/
	function testEqual(a, b) {
		const d = getDiff(a, b)

		if (_.isEqual(a, b)) {
			// they are equal
			expect(d).toEqual(null)
		} else {
			expect(d).toBeTruthy()
		}
	}

	class First {
		value = 1
	}
	First.prototype.value = 1
	class Second {
		value = 1
	}
	Second.prototype.value = 2

	// Basic equality and identity comparisons.
	test('`null` is equal to `null`', () => {
		testEqual(null, null)
	})
	test('`undefined` is equal to `undefined`', () => {
		// @ts-expect-error: undefined parameters
		testEqual()
	})
	test('`0` is not equal to `-0`', () => {
		testEqual(0, -0)
	})
	test('Commutative equality is implemented for `0` and `-0`', () => {
		testEqual(-0, 0)
	})
	test('`null` is not equal to `undefined`', () => {
		testEqual(null, void 0)
	})
	test('Commutative equality is implemented for `null` and `undefined`', () => {
		testEqual(void 0, null)
	})

	// String object and primitive comparisons.
	test('Identical string primitives are equal', () => {
		testEqual('Curly', 'Curly')
	})
	test('String objects with identical primitive values are equal', () => {
		testEqual(new String('Curly'), new String('Curly'))
	})
	test('String primitives and their corresponding object wrappers are equal', () => {
		testEqual(new String('Curly'), 'Curly')
	})
	test('Commutative equality is implemented for string objects and primitives', () => {
		testEqual('Curly', new String('Curly'))
	})

	test('String primitives with different values are not equal', () => {
		testEqual('Curly', 'Larry')
	})
	test('String objects with different primitive values are not equal', () => {
		testEqual(new String('Curly'), new String('Larry'))
	})
	test('String objects and objects with a custom `toString` method are not equal', () => {
		testEqual(new String('Curly'), {
			toString: function () {
				return 'Curly'
			},
		})
	})

	// Number object and primitive comparisons.
	test('Identical number primitives are equal', () => {
		testEqual(75, 75)
	})
	test('Number objects with identical primitive values are equal', () => {
		testEqual(new Number(75), new Number(75))
	})
	test('Number primitives and their corresponding object wrappers are equal', () => {
		testEqual(75, new Number(75))
	})
	test('Commutative equality is implemented for number objects and primitives', () => {
		testEqual(new Number(75), 75)
	})
	test('`new Number(0)` and `-0` are not equal', () => {
		testEqual(new Number(0), -0)
	})
	test('Commutative equality is implemented for `new Number(0)` and `-0`', () => {
		testEqual(0, new Number(-0))
	})

	test('Number objects with different primitive values are not equal', () => {
		testEqual(new Number(75), new Number(63))
	})
	test('Number objects and objects with a `valueOf` method are not equal', () => {
		testEqual(new Number(63), {
			valueOf: function () {
				return 63
			},
		})
	})
	// Comparisons involving `NaN`.
	test('`NaN` is equal to `NaN`', () => {
		testEqual(NaN, NaN)
	})
	test('Object(`NaN`) is equal to `NaN`', () => {
		testEqual(new Number(NaN), NaN)
	})
	test('A number primitive is not equal to `NaN`', () => {
		testEqual(61, NaN)
	})
	test('A number object is not equal to `NaN`', () => {
		testEqual(new Number(79), NaN)
	})
	test('`Infinity` is not equal to `NaN`', () => {
		testEqual(Infinity, NaN)
	})
	// Boolean object and primitive comparisons.
	test('Identical boolean primitives are equal', () => {
		testEqual(true, true)
	})
	test('Boolean objects with identical primitive values are equal', () => {
		testEqual(new Boolean(), new Boolean())
	})
	test('Boolean primitives and their corresponding object wrappers are equal', () => {
		testEqual(true, new Boolean(true))
	})
	test('Commutative equality is implemented for booleans', () => {
		testEqual(new Boolean(true), true)
	})
	test('Boolean objects with different primitive values are not equal', () => {
		testEqual(new Boolean(true), new Boolean())
	})

	// Common type coercions.
	test('`new Boolean(false)` is not equal to `true`', () => {
		testEqual(new Boolean(false), true)
	})
	test('String and number primitives with like values are not equal', () => {
		testEqual('75', 75)
	})
	test('String and number objects with like values are not equal', () => {
		testEqual(new Number(63), new String(63))
	})
	test('Commutative equality is implemented for like string and number values', () => {
		testEqual(75, '75')
	})
	test('Number and string primitives with like values are not equal', () => {
		testEqual(0, '')
	})
	test('Number and boolean primitives with like values are not equal', () => {
		testEqual(1, true)
	})
	test('Boolean and number objects with like values are not equal', () => {
		testEqual(new Boolean(false), new Number(0))
	})
	test('Boolean primitives and string objects with like values are not equal', () => {
		testEqual(false, new String(''))
	})
	test('Dates and their corresponding numeric primitive values are not equal', () => {
		testEqual(12564504e5, new Date(2009, 9, 25))
	})

	// Dates.
	test('Date objects referencing identical times are equal', () => {
		testEqual(new Date(2009, 9, 25), new Date(2009, 9, 25))
	})
	test('Date objects referencing different times are not equal', () => {
		testEqual(new Date(2009, 9, 25), new Date(2009, 11, 13))
	})
	test('Date objects and objects with a `getTime` method are not equal', () => {
		testEqual(new Date(2009, 11, 13), {
			getTime: () => {
				return 12606876e5
			},
		})
	})
	test('Invalid dates are not equal', () => {
		testEqual(new Date('Curly'), new Date('Curly'))
	})

	// Functions.
	test('Different functions with identical bodies and source code representations are not equal', () => {
		testEqual(First, Second)
	})

	// RegExps.
	test('RegExps with equivalent patterns and flags are equal', () => {
		testEqual(/(?:)/gim, /(?:)/gim)
	})
	test('Flag order is not significant', () => {
		testEqual(/(?:)/gi, /(?:)/gi)
	})
	test('RegExps with equivalent patterns and different flags are not equal', () => {
		testEqual(/(?:)/g, /(?:)/gi)
	})
	test('RegExps with different patterns and equivalent flags are not equal', () => {
		testEqual(/Moe/gim, /Curly/gim)
	})
	test('Commutative equality is implemented for RegExps', () => {
		testEqual(/(?:)/gi, /(?:)/g)
	})
	test('RegExps and RegExp-like objects are not equal', () => {
		testEqual(/Curly/g, { source: 'Larry', global: true, ignoreCase: false, multiline: false })
	})

	// Empty arrays, array-like objects, and object literals.
	test('Empty object literals are equal', () => {
		testEqual({}, {})
	})
	test('Empty array literals are equal', () => {
		testEqual([], [])
	})
	test('Empty nested arrays and objects are equal', () => {
		testEqual([{}], [{}])
	})
	test('Array-like objects and arrays are not equal.', () => {
		testEqual({ length: 0 }, [])
	})
	test('Commutative equality is implemented for array-like objects', () => {
		testEqual([], { length: 0 })
	})

	test('Object literals and array literals are not equal', () => {
		testEqual({}, [])
	})
	test('Commutative equality is implemented for objects and arrays', () => {
		testEqual([], {})
	})

	test('Arrays with primitive and object values.', () => {
		testEqual([1, 'Larry', true], [1, 'Larry', true]) // Arrays containing identical primitives are equal
		testEqual([/Moe/g, new Date(2009, 9, 25)], [/Moe/g, new Date(2009, 9, 25)]) // Arrays containing equivalent elements are equal
	})

	test('Multi-dimensional arrays', () => {
		const a: any = [
			new Number(47),
			false,
			'Larry',
			/Moe/,
			new Date(2009, 11, 13),
			['running', 'biking', new String('programming')],
			{ a: 47 },
		]
		const b: any = [
			new Number(47),
			false,
			'Larry',
			/Moe/,
			new Date(2009, 11, 13),
			['running', 'biking', new String('programming')],
			{ a: 47 },
		]
		testEqual(a, b) // Arrays containing nested arrays and objects are recursively compared

		// Overwrite the methods defined in ES 5.1 section 15.4.4.
		a.forEach = a.map = a.filter = a.every = a.indexOf = a.lastIndexOf = a.some = a.reduce = a.reduceRight = null
		b.join = b.pop = b.reverse = b.shift = b.slice = b.splice = b.concat = b.sort = b.unshift = null

		// Array elements and properties.
		testEqual(a, b) // Arrays containing equivalent elements and different non-numeric properties are equal
		a.push('White Rocks')
		testEqual(a, b) // Arrays of different lengths are not equal
		a.push('East Boulder')
		b.push('Gunbarrel Ranch', 'Teller Farm')
		testEqual(a, b) // Arrays of identical lengths containing different elements are not equal
	})

	test('Sparse arrays', () => {
		testEqual(Array(3), Array(3)) // Sparse arrays of identical lengths are equal
		testEqual(Array(3), Array(6)) // Sparse arrays of different lengths are not equal when both are empty

		const sparse: any[] = []
		sparse[1] = 5
		testEqual(sparse, [void 0, 5]) // Handles sparse arrays as dense
	})

	test('Simple objects.', () => {
		testEqual({ a: 'Curly', b: 1, c: true }, { a: 'Curly', b: 1, c: true }) // Objects containing identical primitives are equal
		testEqual({ a: /Curly/g, b: new Date(2009, 11, 13) }, { a: /Curly/g, b: new Date(2009, 11, 13) }) // Objects containing equivalent members are equal
		testEqual({ a: 63, b: 75 }, { a: 61, b: 55 }) // Objects of identical sizes with different values are not equal
		testEqual({ a: 63, b: 75 }, { a: 61, c: 55 }) // Objects of identical sizes with different property names are not equal
		testEqual({ a: 1, b: 2 }, { a: 1 }) // Objects of different sizes are not equal
		testEqual({ a: 1 }, { a: 1, b: 2 }) // Commutative equality is implemented for objects
		testEqual({ x: 1, y: void 0 }, { x: 1, z: 2 }) // Objects with identical keys and different values are not equivalent

		// `A` contains nested objects and arrays.
		const a = {
			name: new String('Moe Howard'),
			age: new Number(77),
			stooge: true,
			hobbies: ['acting'],
			film: {
				name: 'Sing a Song of Six Pants',
				release: new Date(1947, 9, 30),
				stars: [new String('Larry Fine'), 'Shemp Howard'],
				minutes: new Number(16),
				seconds: 54,
			},
		}

		// `B` contains equivalent nested objects and arrays.
		const b = {
			name: new String('Moe Howard'),
			age: new Number(77),
			stooge: true,
			hobbies: ['acting'],
			film: {
				name: 'Sing a Song of Six Pants',
				release: new Date(1947, 9, 30),
				stars: [new String('Larry Fine'), 'Shemp Howard'],
				minutes: new Number(16),
				seconds: 54,
			},
		}
		testEqual(a, b) // Objects with nested equivalent members are recursively compared
	})

	test('Instances.', () => {
		testEqual(new First(), new First()) // Object instances are equal
		testEqual(new First(), new Second()) // Objects with different constructors and identical own properties are not equal
		testEqual({ value: 1 }, new First()) // Object instances and objects sharing equivalent properties are not equal
		testEqual({ value: 2 }, new Second()) // The prototype chain of objects should not be examined
	})

	test('Circular Arrays.', () => {
		const a: any[] = []
		a.push(a)
		const b: any[] = []
		b.push(b)

		testEqual(a, b) // Arrays containing circular references are equal
		a.push(new String('Larry'))
		b.push(new String('Larry'))
		testEqual(a, b) // Arrays containing circular references and equivalent properties are equal
		a.push('Shemp')
		b.push('Curly')
		testEqual(a, b) // Arrays containing circular references and different properties are not equal
	})

	test('More circular arrays #767.', () => {
		const a: any = ['everything is checked but', 'this', 'is not']
		a[1] = a
		const b = ['everything is checked but', ['this', 'array'], 'is not']

		testEqual(a, b) // Comparison of circular references with non-circular references are not equal
	})

	test('Circular Objects.', () => {
		const a: any = { abc: null }
		const b: any = { abc: null }
		a.abc = a
		b.abc = b
		testEqual(a, b) // Objects containing circular references are equal
		a.def = 75
		b.def = 75
		testEqual(a, b) // Objects containing circular references and equivalent properties are equal
		a.def = new Number(75)
		b.def = new Number(63)
		testEqual(a, b) // Objects containing circular references and different properties are not equal
	})

	test('More circular objects #767.', () => {
		const a: any = { everything: 'is checked', but: 'this', is: 'not' }
		a.but = a
		const b: any = { everything: 'is checked', but: { that: 'object' }, is: 'not' }
		testEqual(a, b) // Comparison of circular references with non-circular object references are not equal
	})

	test('Cyclic Structures.', () => {
		const a: any = [{ abc: null }]
		const b: any = [{ abc: null }]

		a[0].abc = a
		a.push(a)
		b[0].abc = b
		b.push(b)
		testEqual(a, b) // Cyclic structures are equal
		a[0].def = 'Larry'
		b[0].def = 'Larry'
		testEqual(a, b) // Cyclic structures containing equivalent properties are equal
		a[0].def = new String('Larry')
		b[0].def = new String('Curly')
		testEqual(a, b) // Cyclic structures containing different properties are not equal
	})

	test('Complex Circular References.', () => {
		const a: any = { foo: { b: { foo: { c: { foo: null } } } } }
		const b: any = { foo: { b: { foo: { c: { foo: null } } } } }
		a.foo.b.foo.c.foo = a
		b.foo.b.foo.c.foo = b
		testEqual(a, b) // Cyclic structures with nested and identically-named properties are equal
	})

	test('Chaining.', () => {
		testEqual(_({ x: 1, y: void 0 }).chain(), _({ x: 1, z: 2 }).chain()) // Chained objects containing different values are not equal
		const a = _({ x: 1, y: 2 }).chain()
		const b = _({ x: 1, y: 2 }).chain()
		// assert.strictEqual(equal(a.isEqual(b), _(true)), true, '`isEqual` can be chained
		testEqual(a.isEqual(b), _(true)) // `isEqual` can be chained
	})

	test('Objects without a `constructor` property', () => {
		let a: any
		let b: any
		if (Object.create) {
			a = Object.create(null, { x: { value: 1, enumerable: true } })
			b = { x: 1 }
			testEqual(a, b) // Handles objects without a constructor (e.g. from Object.create
		}

		class Foo {
			a = 1
		}
		// @ts-expect-error: remove constructor
		Foo.prototype.constructor = null

		const other = { a: 1 }
		// assert.strictEqual(equal(new Foo, other), false, 'Objects from different constructors are not equal')
		testEqual(new Foo(), other) // Objects from different constructors are not equal
	})

	test('Tricky object cases val comparisons', () => {
		testEqual([0], [-0])
		testEqual({ a: 0 }, { a: -0 })
		testEqual([NaN], [NaN])
		testEqual({ a: NaN }, { a: NaN })

		const symbol = Symbol('x')
		testEqual(symbol, symbol) // A symbol is equal to itself
		testEqual(symbol, Object(symbol)) // Even when wrapped in Object()

		/*
		testEqual(symbol, null)  // Different types are not equal

		let symbolY = Symbol('y')
		testEqual(symbol, symbolY)  // Different symbols are not equal

		let sameStringSymbol = Symbol('x')
		testEqual(symbol, sameStringSymbol)  // Different symbols of same string are not equal
		*/
	})

	// testEqual(0).toEqual(1)
})
