import { Mapping } from './mapping'
import { DeviceType, TSRTimelineObjBaseWithOnAir } from '.'

export interface MappingQuantel extends Mapping {
	device: DeviceType.QUANTEL

	/** The port to use  */
	portId: string
	/** The channel to connect the port to */
	channelId: number
	// keyChannelID: number // not implemented yet, used when outputting Key + Fill

	/** Which strategy to use during "busy times" (defaults to QUALITY) */
	mode?: QuantelControlMode
}
export enum QuantelControlMode {
	/** Try to avoid freeze-frames when playing */
	QUALITY = 'quality',
	/** Try to play as fast as possible */
	SPEED = 'speed',
}

export interface QuantelOptions {
	/** Url to the quantel gateway  */
	gatewayUrl: string

	/** Location of the ISA manager to be connected to first of all. */
	ISAUrlMaster: string
	/** Optional backup ISA manager for the gateway to switch to in the event of failure of the master. */
	ISAUrlBackup?: string

	/** The ID of the zone to use. If omitted, will be using "default" */
	zoneId?: string
	/** The id of the server to control. An integer */
	serverId: number

	/** If set: If a clip turns out to be on the wrong server, an attempt to copy the clip will be done. */
	allowCloneClips?: boolean

	// doAutomaticCloningIfNeeded?: bool // not implemented yet
}

export type TimelineObjQuantelAny = TimelineObjQuantelClip
export interface TimelineObjQuantelClip extends TSRTimelineObjBaseWithOnAir {
	content: {
		deviceType: DeviceType.QUANTEL
		notOnAir?: boolean

		/** The title of the clip to be played (example: 'AMB'), either this or guid must be provided */
		title?: string

		/** The GUID of the clip to be played, either this or title must be provided */
		guid?: string

		/** The point where the file returns to, when looping [milliseconds from start of file] */
		inPoint?: number
		/** The duration of the file. The playout will either freeze after this time. */
		length?: number

		/** When pausing, the unix-time the playout was paused. */
		pauseTime?: number
		/** If the video is playing or is paused (defaults to true) */
		playing?: boolean

		/** If true, the startTime won't be used to SEEK to the correct place in the media */
		noStarttime?: boolean

		// inTransition?: QuantelTransition
		outTransition?: QuantelOutTransition
	}
}
export type QuantelOutTransition = QuantelTransitionDelay
export interface QuantelTransitionBase {
	type: QuantelTransitionType
}
export enum QuantelTransitionType {
	DELAY = 0,
}
export interface QuantelTransitionDelay {
	type: QuantelTransitionType.DELAY

	// For how long to delay the stop (ms)
	delay: number
}
