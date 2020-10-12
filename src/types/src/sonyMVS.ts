import { Mapping } from './mapping'
import { TSRTimelineObjBase, DeviceType } from '.'

export interface SonyMVSOptions {
	host: string
	port: number
}

export interface MappingSonyMVS extends Mapping {
	device: DeviceType.SONYMVS
	mappingType: MappingSonyMVSType,
	index: number
}
export enum MappingSonyMVSType {
	MixEffect = 'me',
	Auxiliary = 'aux'
}

export enum TimelineContentTypeSonyMVS {
	MixEffect = 'me',
	Auxiliary = 'aux'
}
export enum SonyMVSTransitionType {
	MIX = 'MIX',
	WIPE = 'WIPE',
	NAME = 'NAME',
	SUPERMIX = 'SUPERMIX',
	PST_BKGD_MIX = 'PST_BKGD_MIX',
	DME_WIPE = 'DME_WIPE',
	CUT = 'CUT'
}

export interface TimelineObjSonyMVSMixEffect extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.SONYMVS
		type: TimelineContentTypeSonyMVS.MixEffect

		me: {
			input: number,
			transitionType?: SonyMVSTransitionType
			transitionRate?: number

			keyers?: {
				source?: number,
				fill?: number,
				onAir?: boolean
			}[],
		}
	}
}
export interface TimelineObjSonyMVSAux extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.SONYMVS
		type: TimelineContentTypeSonyMVS.Auxiliary

		aux: number
	}
}

export type TimelineObjSonyMVS = TimelineObjSonyMVSMixEffect | TimelineObjSonyMVSAux
