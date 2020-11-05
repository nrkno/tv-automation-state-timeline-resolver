import { Mapping } from './mapping'
import { DeviceType, TSRTimelineObjBase } from '.'

export interface SisyfosOptions {
	host: string
	port: number
}

export enum MappingSisyfosType {
	CHANNEL = 'channel',
	CHANNELS = 'channels',
}
export type MappingSisyfos = MappingSisyfosChannel | MappingSisyfosChannels
interface MappingSisyfosBase extends Mapping {
	device: DeviceType.SISYFOS
	mappingType: MappingSisyfosType // defaults to MappingSisyfosType.CHANNEL if not set
}
export interface MappingSisyfosChannel extends MappingSisyfosBase {
	mappingType: MappingSisyfosType.CHANNEL
	channel: number
}
export interface MappingSisyfosChannels extends MappingSisyfosBase {
	mappingType: MappingSisyfosType.CHANNELS
}

export enum TimelineContentTypeSisyfos {
	/** @deprecated use CHANNEL instead */
	SISYFOS = 'sisyfos',
	CHANNEL = 'channel',
	CHANNELS = 'channels',
}

export type TimelineObjSisyfosAny = TimelineObjSisyfosChannel | TimelineObjSisyfosChannels

export interface TimelineObjSisyfos extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.SISYFOS
		type: TimelineContentTypeSisyfos
	}
}

export interface SisyfosChannelOptions {
	isPgm?: 0 | 1 | 2 // 0=off 1=PGM 2=VO
	faderLevel?: number
	label?: string
	visible?: boolean
}

export interface TimelineObjSisyfosChannel extends TimelineObjSisyfos {
	content: {
		deviceType: DeviceType.SISYFOS
		type: TimelineContentTypeSisyfos.CHANNEL
		resync?: boolean
		overridePriority?: number // defaults to 0
	} & SisyfosChannelOptions
}
export interface TimelineObjSisyfosChannels extends TimelineObjSisyfos {
	content: {
		deviceType: DeviceType.SISYFOS
		type: TimelineContentTypeSisyfos.CHANNELS
		channels: ({
			/** The mapping layer to look up the channel from */
			mappedLayer: string
		} & SisyfosChannelOptions)[]
		resync?: boolean
		overridePriority?: number // defaults to 0
	}
}
// Backwards compatibility:
/** @deprecated use TimelineObjSisyfosChannel instead */
export type TimelineObjSisyfosMessage = TimelineObjSisyfosChannel
