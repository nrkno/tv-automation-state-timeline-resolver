import { Mapping } from './mapping'
import { TSRTimelineObjBase, DeviceType } from '.'

export interface ShotokuOptions {
	host: string
	port: number
}

export interface MappingShotoku extends Mapping {
	device: DeviceType.SHOTOKU
}

export enum TimelineContentTypeShotoku {
	SHOT = 'shot',
}

export enum ShotokuTransitionType {
	Cut = 'cut',
	Fade = 'fade',
}
export interface ShotokuCommandContent {
	shot: number
	show?: number /** Defaults to 1 */
	transitionType?: ShotokuTransitionType
	changeOperatorScreen?: boolean
}

export interface TimelineObjShotoku extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.SHOTOKU
		type: TimelineContentTypeShotoku
	} & ShotokuCommandContent
}
