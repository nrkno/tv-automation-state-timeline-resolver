import { Mapping } from './mapping'
import { TSRTimelineObjBase, DeviceType } from '.'

export type EmberValue = number | string | boolean | Buffer | null
enum ParameterType {
	Null = 'NULL',
	Integer = 'INTEGER',
	Real = 'REAL',
	String = 'STRING',
	Boolean = 'BOOLEAN',
	Trigger = 'TRIGGER',
	Enum = 'ENUM',
	Octets = 'OCTETS',
}

export interface MappingLawo extends Mapping {
	device: DeviceType.LAWO
	mappingType: MappingLawoType
	identifier?: string
	emberType?: ParameterType
	priority?: number
}
export enum MappingLawoType {
	SOURCE = 'source',
	SOURCES = 'sources', // TODO - naming? can this also be a full path or trigger val?
	FULL_PATH = 'fullpath',
	TRIGGER_VALUE = 'triggerValue',
}
export enum LawoDeviceMode {
	R3lay,
	Ruby,
	RubyManualRamp,
	MC2,
	Manual,
}
export interface LawoOptions {
	setValueFn?: SetLawoValueFn
	host?: string
	port?: number

	deviceMode: LawoDeviceMode

	faderInterval?: number

	/** Manual mode only: */
	sourcesPath?: string
	dbPropertyName?: string
	rampMotorFunctionPath?: string
	faderThreshold?: number
}
export type SetLawoValueFn = (command: LawoCommand, timelineObjId: string, logCommand?: boolean) => Promise<any>
export interface LawoCommand {
	path: string
	value: EmberValue
	valueType: ParameterType
	key: string
	identifier: string
	type: TimelineContentTypeLawo
	transitionDuration?: number
	from?: EmberValue
	priority: number
}

export enum TimelineContentTypeLawo { //  Lawo-state
	SOURCE = 'lawosource', // a general content type, possibly to be replaced by specific ones later?
	SOURCES = 'lawosources',
	EMBER_PROPERTY = 'lawofullpathemberproperty',
	TRIGGER_VALUE = 'triggervalue',
}

export type TimelineObjLawoAny =
	| TimelineObjLawoSources
	| TimelineObjLawoSource
	| TimelineObjLawoSourceDeprecated
	| TimelineObjLawoEmberProperty
	| TimelineObjLawoEmberRetrigger

export interface ContentTimelineObjLawoSource {
	faderValue: number
	transitionDuration?: number
}

export interface TimelineObjLawoBase extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.LAWO
		type: TimelineContentTypeLawo
	}
}
export interface TimelineObjLawoSources extends TimelineObjLawoBase {
	content: {
		deviceType: DeviceType.LAWO
		type: TimelineContentTypeLawo.SOURCES

		sources: Array<
			{
				mappingName: string
			} & ContentTimelineObjLawoSource
		>
		overridePriority?: number // defaults to 0
	}
}
// TODO - remove this interface during the next breaking change:
export interface TimelineObjLawoSourceDeprecated extends TimelineObjLawoBase {
	content: {
		deviceType: DeviceType.LAWO
		type: TimelineContentTypeLawo.SOURCE

		'Fader/Motor dB Value': {
			value: number
			transitionDuration?: number
		}
	}
}
export interface TimelineObjLawoSource extends TimelineObjLawoBase {
	content: {
		deviceType: DeviceType.LAWO
		type: TimelineContentTypeLawo.SOURCE

		overridePriority?: number // defaults to 0
	} & ContentTimelineObjLawoSource
}
export interface TimelineObjLawoEmberProperty extends TimelineObjLawoBase {
	content: {
		deviceType: DeviceType.LAWO
		type: TimelineContentTypeLawo.EMBER_PROPERTY
		value: EmberValue
	}
}
export interface TimelineObjLawoEmberRetrigger extends TimelineObjLawoBase {
	content: {
		deviceType: DeviceType.LAWO
		type: TimelineContentTypeLawo.TRIGGER_VALUE
		triggerValue: string
	}
}
