export * from './abstract'
export * from './atem'
export * from './casparcg'
export * from './httpSend'
export * from './httpWatcher'
export * from './hyperdeck'
export * from './lawo'
export * from './osc'
export * from './pharos'
export * from './panasonicPTZ'
export * from './sisyfos'
export * from './sonyMVS'
export * from './quantel'
export * from './shotoku'
export * from './tcpSend'
export * from './vizMSE'
export * from './singularLive'
export * from './vmix'

export * from './device'
export * from './mapping'

import * as Timeline from './superfly-timeline'
import { TimelineObjAtemAny } from './atem'
import { TimelineObjCasparCGAny } from './casparcg'
import { TimelineObjHTTPSendAny } from './httpSend'
import { TimelineObjTCPSendAny } from './tcpSend'
import { TimelineObjHyperdeckAny } from './hyperdeck'
import { TimelineObjLawoAny } from './lawo'
import { TimelineObjOSCAny } from './osc'
import { TimelineObjPharosAny } from './pharos'
import { TimelineObjPanasonicPtzAny } from './panasonicPTZ'
import { TimelineObjAbstractAny } from './abstract'
import { TSRTimelineObjProps } from './mapping'
import { TimelineObjQuantelAny } from './quantel'
import { TimelineObjShotoku } from './shotoku'
import { TimelineObjSisyfosAny } from './sisyfos'
import { TimelineObjSonyMVS } from './sonyMVS'
import { TimelineObjVIZMSEAny } from './vizMSE'
import { TimelineObjSingularLiveAny } from './singularLive'
import { TimelineObjVMixAny } from './vmix'

export { Timeline }
export * from './mapping'
export * from './expectedPlayoutItems'

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

export enum DeviceType {
	ABSTRACT = 0,
	CASPARCG = 1,
	ATEM = 2,
	LAWO = 3,
	HTTPSEND = 4,
	PANASONIC_PTZ = 5,
	TCPSEND = 6,
	HYPERDECK = 7,
	PHAROS = 8,
	OSC = 9,
	HTTPWATCHER = 10,
	SISYFOS = 11,
	QUANTEL = 12,
	VIZMSE = 13,
	SINGULAR_LIVE = 14,
	SHOTOKU = 15,
	SONYMVS = 16,
	VMIX = 20
}

export interface TSRTimelineKeyframe<T> extends Timeline.TimelineKeyframe {
	content: Partial<T>
}

export interface TSRTimelineObjBase extends Omit<Timeline.TimelineObject, 'content'>, TSRTimelineObjProps {
	content: {
		deviceType: DeviceType
	}
	keyframes?: Array<TSRTimelineKeyframe<this['content']>>
}

export interface TSRTimelineObjBaseWithOnAir extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType
		/** If the object in question is intended to NOT be on air.
		 * The exact result depends on the device, but it could affect things like making in-transitions quicker, faster camera movements, etc..
		 */
		notOnAir?: boolean
	}
}

export interface TimelineObjEmpty extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.ABSTRACT
		type: 'empty'
	}
	classes: Array<string>
}

export type TSRTimelineObj = (
	TimelineObjEmpty |
	TimelineObjAbstractAny |
	TimelineObjAtemAny |
	TimelineObjCasparCGAny |
	TimelineObjHTTPSendAny |
	TimelineObjTCPSendAny |
	TimelineObjHyperdeckAny |
	TimelineObjLawoAny |
	TimelineObjOSCAny |
	TimelineObjPharosAny |
	TimelineObjPanasonicPtzAny |
	TimelineObjQuantelAny |
	TimelineObjShotoku |
	TimelineObjSisyfosAny |
	TimelineObjSonyMVS |
	TimelineObjSingularLiveAny |
	TimelineObjVMixAny |
	TimelineObjVIZMSEAny |
	TimelineObjSingularLiveAny
)

export type TSRTimeline = Array<TSRTimelineObj>
