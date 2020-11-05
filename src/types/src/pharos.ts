import { Mapping } from './mapping'
import { TSRTimelineObjBase, DeviceType } from '.'

export interface PharosOptions {
	host: string
	ssl?: boolean
}

export interface MappingPharos extends Mapping {
	device: DeviceType.PHAROS
}

export enum TimelineContentTypePharos {
	SCENE = 'scene',
	TIMELINE = 'timeline',
}

export type TimelineObjPharosAny = TimelineObjPharosScene | TimelineObjPharosTimeline

export interface TimelineObjPharos extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.PHAROS
		type: TimelineContentTypePharos

		/** override: don't stop / release */
		noRelease?: true
		stopped?: boolean
	}
}
export interface TimelineObjPharosScene extends TimelineObjPharos {
	content: {
		deviceType: DeviceType.PHAROS
		type: TimelineContentTypePharos.SCENE
		stopped?: boolean
		noRelease?: true

		scene: number
		fade?: number
	}
}
export interface TimelineObjPharosTimeline extends TimelineObjPharos {
	content: {
		deviceType: DeviceType.PHAROS
		type: TimelineContentTypePharos.TIMELINE
		stopped?: boolean
		noRelease?: true

		timeline: number
		pause?: boolean
		rate?: boolean
		fade?: number
	}
}
