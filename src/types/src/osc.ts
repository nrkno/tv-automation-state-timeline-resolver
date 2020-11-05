import { Mapping } from './mapping'
import { TSRTimelineObjBase, DeviceType } from '.'

// Note: This type is a loose referral to (a copy of) keyof typeof Easing in '../../easings', so that Easing structure won't be included in the types package
export type OSCEasingType =
	| 'Linear'
	| 'Quadratic'
	| 'Cubic'
	| 'Quartic'
	| 'Quintic'
	| 'Sinusoidal'
	| 'Exponential'
	| 'Circular'
	| 'Elastic'
	| 'Back'
	| 'Bounce'

export interface OSCOptions {
	host: string
	port: number
}

export interface MappingOSC extends Mapping {
	device: DeviceType.OSC
}

export enum TimelineContentTypeOSC {
	OSC = 'osc',
}

export enum OSCValueType {
	INT = 'i',
	FLOAT = 'f',
	STRING = 's',
	BLOB = 'b',
}

export interface OSCValueNumber {
	type: OSCValueType.INT | OSCValueType.FLOAT
	value: number
}
export interface OSCValueString {
	type: OSCValueType.STRING
	value: string
}
export interface OSCValueBlob {
	type: OSCValueType.BLOB
	value: Uint8Array
}
export type SomeOSCValue = OSCValueNumber | OSCValueString | OSCValueBlob

export interface OSCMessageCommandContent {
	type: TimelineContentTypeOSC.OSC
	path: string
	values: SomeOSCValue[]
	transition?: {
		duration: number
		type: OSCEasingType
		direction: 'In' | 'Out' | 'InOut' | 'None'
	}
	from?: SomeOSCValue[]
}
export type TimelineObjOSCAny = TimelineObjOSCMessage

export interface TimelineObjOSC extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.OSC
		type: TimelineContentTypeOSC
	}
}
export interface TimelineObjOSCMessage extends TimelineObjOSC {
	content: {
		deviceType: DeviceType.OSC
	} & OSCMessageCommandContent
}
