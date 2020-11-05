import { Mapping } from './mapping'
import { TSRTimelineObjBase, DeviceType } from '.'

export interface MappingPanasonicPtz extends Mapping {
	device: DeviceType.PANASONIC_PTZ
	mappingType: MappingPanasonicPtzType
}
export enum MappingPanasonicPtzType {
	PRESET_SPEED = 0,
	PRESET = 1,
	ZOOM = 2,
	ZOOM_SPEED = 3,
}

export interface PanasonicPTZOptions {
	host?: string
	port?: number
	https?: boolean
}

export enum TimelineContentTypePanasonicPtz {
	PRESET = 'presetMem',
	SPEED = 'presetSpeed',
	ZOOM_SPEED = 'zoomSpeed',
	ZOOM = 'zoom',
}

export type TimelineObjPanasonicPtzAny =
	| TimelineObjPanasonicPtzZoomSpeed
	| TimelineObjPanasonicPtzZoom
	| TimelineObjPanasonicPtzPresetSpeed
	| TimelineObjPanasonicPtzPreset
export interface TimelineObjPanasonicPtz extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.PANASONIC_PTZ
		type: TimelineContentTypePanasonicPtz
	}
}
export interface TimelineObjPanasonicPtzZoomSpeed extends TimelineObjPanasonicPtz {
	content: {
		deviceType: DeviceType.PANASONIC_PTZ
		type: TimelineContentTypePanasonicPtz.ZOOM_SPEED
		zoomSpeed: number
	}
}

export interface TimelineObjPanasonicPtzZoom extends TimelineObjPanasonicPtz {
	content: {
		deviceType: DeviceType.PANASONIC_PTZ
		type: TimelineContentTypePanasonicPtz.ZOOM
		zoom: number
	}
}

export interface TimelineObjPanasonicPtzPresetSpeed extends TimelineObjPanasonicPtz {
	content: {
		deviceType: DeviceType.PANASONIC_PTZ
		type: TimelineContentTypePanasonicPtz.SPEED
		speed: number
	}
}

export interface TimelineObjPanasonicPtzPreset extends TimelineObjPanasonicPtz {
	content: {
		deviceType: DeviceType.PANASONIC_PTZ
		type: TimelineContentTypePanasonicPtz.PRESET
		preset: number
	}
}
