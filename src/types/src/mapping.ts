import { ResolvedTimelineObjectInstance } from './superfly-timeline'
import { DeviceType } from '.'

export interface Mappings {
	[layerName: string]: Mapping
}
export interface Mapping {
	device: DeviceType
	deviceId: string
}

export interface ResolvedTimelineObjectInstanceExtended extends ResolvedTimelineObjectInstance, TSRTimelineObjProps {}

export interface TSRTimelineObjProps {
	/** Only set to true when an object is inserted by lookahead */
	isLookahead?: boolean
	/** Only valid when isLookahead is true. Set so that a lookahead object knows what layer it belongs to */
	lookaheadForLayer?: string | number
}
