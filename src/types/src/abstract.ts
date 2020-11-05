import { TSRTimelineObjBase, DeviceType, Mapping } from '.'

export interface MappingAbstract extends Mapping {
	device: DeviceType.ABSTRACT
}

export type AbstractOptions = Record<string, unknown>

export type TimelineObjAbstractAny = TSRTimelineObjAbstract
export interface TSRTimelineObjAbstract extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.ABSTRACT
		[key: string]: any
	}
}
