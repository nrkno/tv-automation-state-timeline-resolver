import { Mapping } from './mapping'
import { TSRTimelineObjBase, DeviceType } from '.'

export interface MappingVizMSE extends Mapping {
	device: DeviceType.VIZMSE
}
export interface VizMSEOptions {
	/** Host name or IP adress to the MSE machine */
	host: string
	/** Port number to the REST interface (optional) */
	restPort?: number
	/** Port number to the web-sockets interface (optional) */
	wsPort?: number

	/** Identifier of the "show" to use */
	showID: string
	/** Identifier of the "profile" to send commands to */
	profile: string
	/** Identifier of the "playlist" to send commands to */
	playlistID?: string

	/** Whether all elements should be preloaded or not */
	preloadAllElements?: boolean

	/** Whether internal elements should automatically be loaded when added to expectedPlayoutItems */
	autoLoadInternalElements?: boolean

	/**
	 * It is a common practice to have an element which only purpose is to "clear all graphics" on the vizEngine.
	 * To use this in TSR, set a reference to that here:
	 */
	clearAllTemplateName?: string
	/** Whether to trigger a clear all templates upon makeReady */
	clearAllOnMakeReady?: boolean
	// profileName
	/** If true, the rundown won't be deactivated on standdown */
	dontDeactivateOnStandDown?: boolean
	/** If true, only elements in the currently active rundown will be loaded */
	onlyPreloadActiveRundown?: boolean
	/** List of commands to be sent to Viz Engines in order to fully clear them */
	clearAllCommands?: string[]
}
export enum TimelineContentTypeVizMSE {
	ELEMENT_INTERNAL = 'element_internal',
	ELEMENT_PILOT = 'element_pilot',
	CONTINUE = 'continue',
	LOAD_ALL_ELEMENTS = 'load_all_elements',
	CLEAR_ALL_ELEMENTS = 'clear_all_elements',
}

export type TimelineObjVIZMSEAny =
	| TimelineObjVIZMSEElementInternal
	| TimelineObjVIZMSEElementPilot
	| TimelineObjVIZMSEElementContinue
	| TimelineObjVIZMSELoadAllElements
	| TimelineObjVIZMSEClearAllElements

export interface TimelineObjVIZMSEBase extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.VIZMSE
		type: TimelineContentTypeVizMSE

		/** When this changes, a continue-function will be triggered */
		continueStep?: number

		/** What channel to output to */
		channelName?: string

		/** Don't play, only cue the element  */
		cue?: boolean

		/** If true, won't be preloaded automatically */
		noAutoPreloading?: boolean

		// inTransition?: VIZMSEOutTransition
		outTransition?: VIZMSEOutTransition
	}
}
export interface TimelineObjVIZMSEElementInternal extends TimelineObjVIZMSEBase {
	content: {
		deviceType: DeviceType.VIZMSE
		type: TimelineContentTypeVizMSE.ELEMENT_INTERNAL

		/** When this changes, a continue-function will be triggered */
		continueStep?: number

		/** What channel to output to */
		channelName?: string

		/** Don't play, only cue the element  */
		cue?: boolean

		/** If true, won't be preloaded (cued) automatically */
		noAutoPreloading?: boolean

		// inTransition?: VIZMSEOutTransition
		outTransition?: VIZMSEOutTransition

		/** Name of the template to be played */
		templateName: string
		/** Data to be fed into the template */
		templateData: Array<string>
	}
}
export interface TimelineObjVIZMSEElementPilot extends TimelineObjVIZMSEBase {
	content: {
		deviceType: DeviceType.VIZMSE
		type: TimelineContentTypeVizMSE.ELEMENT_PILOT

		/** When this changes, a continue-function will be triggered */
		continueStep?: number

		/** What channel to output to */
		channelName?: string

		/** Don't play, only cue the element  */
		cue?: boolean

		/** If true, won't be preloaded (cued) automatically */
		noAutoPreloading?: boolean

		// inTransition?: VIZMSEOutTransition
		outTransition?: VIZMSEOutTransition

		/** Viz-Pilot id of the template to be played */
		templateVcpId: number
	}
}
export interface TimelineObjVIZMSEElementContinue extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.VIZMSE
		type: TimelineContentTypeVizMSE.CONTINUE

		/** Whether to continue or reverse (defaults to 1) */
		direction?: 1 | -1

		/** What other layer to continue */
		reference: string
	}
}
export interface TimelineObjVIZMSELoadAllElements extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.VIZMSE
		type: TimelineContentTypeVizMSE.LOAD_ALL_ELEMENTS
	}
}
export interface TimelineObjVIZMSEClearAllElements extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.VIZMSE
		type: TimelineContentTypeVizMSE.CLEAR_ALL_ELEMENTS

		/** Names of the channels to send the special clear commands to */
		channelsToSendCommands?: string[]
	}
}

export type VIZMSEOutTransition = VIZMSETransitionDelay
export interface VIZMSETransitionBase {
	type: VIZMSETransitionType
}
export enum VIZMSETransitionType {
	DELAY = 0,
}
export interface VIZMSETransitionDelay {
	type: VIZMSETransitionType.DELAY

	// For how long to delay the take out (ms)
	delay: number
}
export interface VIZMSEPlayoutItemContent {
	/** Name of the element, or Pilot Element */
	templateName: string | number // if number, it's a vizPilot element
	/** Data fields of the element (for internal elements only) */
	templateData?: string[]
	/** What channel to use for the element */
	channelName?: string

	/** If true, won't be preloaded (cued) automatically */
	noAutoPreloading?: boolean
}
