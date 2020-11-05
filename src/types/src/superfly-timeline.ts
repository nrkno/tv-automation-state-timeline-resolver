// Note: These types are copies from superfly-timeline

// Enums ------------------------------------------------------------
export enum EventType {
	START = 0,
	END = 1,
	KEYFRAME = 2,
}
// Api ------------------------------------------------------------
/** Unix timestamp */
export declare type Time = number
/** Duration */
export declare type Duration = number
export declare type TimeMaybe = Time | null
export declare type DurationMaybe = Duration | null
export declare type ObjectId = string
export declare type Times = Array<Time>
export interface ResolveOptions {
	/** The base time to use when resolving. Usually you want to input the current time (Date.now()) here. */
	time: Time
	/** Limits the number of repeating objects in the future.
	 * Defaults to 2, which means that the current one and the next will be resolved.
	 */
	limitCount?: number
	/** Limits the repeating objects to a time in the future */
	limitTime?: Time
	/** If set to true, the resolver will go through the instances of the objects and fix collisions, so that the instances more closely resembles the end state. */
	resolveInstanceCollisions?: boolean
}
export interface TimelineObject {
	id: ObjectId
	enable: TimelineEnable | TimelineEnable[]
	layer: string | number
	/** Group children */
	children?: Array<TimelineObject>
	/** Keyframes can be used to modify the content of an object */
	keyframes?: Array<TimelineKeyframe>
	classes?: Array<string>
	disabled?: boolean
	isGroup?: boolean
	priority?: number
	content: Content
}
export declare type Content = {
	[key: string]: any
}
export interface TimelineEnable {
	/**
	 * Examples of references:
	 * #objectId
	 * #objectId.start
	 * #objectId.end
	 * #objectId.duration
	 * .className
	 * .className.start + 5
	 * $layerName
	 */
	/** (Optional) The start time of the object. (Cannot be combined with .while) */
	start?: Expression
	/** (Optional) The end time of the object (Cannot be combined with .while or .duration) */
	end?: Expression
	/** (Optional) Enables the object WHILE expression is true (ie sets both the start and end). (Cannot be combined with .start, .end or .duration ) */
	while?: Expression
	/** (Optional) The duration of an object */
	duration?: Expression
	/** (Optional) Makes the object repeat with given interval */
	repeating?: Expression
}
export interface TimelineKeyframe {
	id: string
	enable: TimelineEnable | TimelineEnable[]
	duration?: number | string
	classes?: Array<string>
	content: Content
	disabled?: boolean
}
export interface TimelineObjectKeyframe extends TimelineObject, TimelineKeyframe {}
export interface ResolvedTimeline {
	/** The options used to resolve the timeline */
	options: ResolveOptions
	/** Map of all objects on timeline */
	objects: ResolvedTimelineObjects
	/** Map of all classes on timeline, maps className to object ids */
	classes: {
		[className: string]: Array<string>
	}
	/** Map of the object ids, per layer */
	layers: {
		[layer: string]: Array<string>
	}
	statistics: {
		/** Number of objects that were unable to resolve */
		unresolvedCount: number
		/** Number of objects that were resolved */
		resolvedCount: number
		/** Number of resolved instances */
		resolvedInstanceCount: number
		/** Number of resolved objects */
		resolvedObjectCount: number
		/** Number of resolved groups */
		resolvedGroupCount: number
		/** Number of resolved keyframes */
		resolvedKeyframeCount: number
		/** How many objects that was actually resolved (is affected when using cache) */
		resolvingCount: number
	}
}
export interface ResolvedTimelineObjects {
	[id: string]: ResolvedTimelineObject
}
export interface ResolvedTimelineObject extends TimelineObject {
	resolved: {
		/** Is set to true when object has been resolved */
		resolved: boolean
		/** Is set to true while object is resolved (to prevent circular references) */
		resolving: boolean
		/** Instances of the object on the timeline */
		instances: Array<TimelineObjectInstance>
		/** Increases the more levels inside of a group the objects is */
		levelDeep?: number
		/** Id of the parent object */
		parentId?: string
		/** True if object is a keyframe */
		isKeyframe?: boolean
		/** True if object is referencing itself (only directly, not indirectly via another object) */
		isSelfReferencing?: boolean
		/** Ids of all other objects that directly affects this object (ie through direct reference, classes, etc) */
		directReferences: string[]
	}
}
export interface TimelineObjectInstance {
	id: string
	isFirst?: boolean
	start: Time
	end: Time | null
	references: Array<string>
	caps?: Array<Cap>
}
export interface Cap {
	id: string
	start: Time
	end: Time | null
}
export interface ValueWithReference {
	value: number
	references: Array<string>
}
export interface InstanceEvent<T = any> {
	time: Time
	value: boolean
	references: Array<string>
	data: T
}
export declare type Expression = number | string | ExpressionObj | null
export interface ExpressionObj {
	l: Expression
	o: string
	r: Expression
}
export declare type ExpressionEvent = InstanceEvent<boolean>
export declare type ResolvedExpression = Array<ExpressionEvent>
export interface ResolvedExpressionObj {
	l: ResolvedExpression
	o: '+' | '-' | '*' | '/' | '&' | '|' | '!'
	r: ResolvedExpression
}
export interface TimelineState {
	time: Time
	layers: StateInTime
	nextEvents: Array<NextEvent>
}
export interface ResolvedStates extends ResolvedTimeline {
	state: AllStates
	nextEvents: Array<NextEvent>
}
export interface ResolvedTimelineObjectInstance extends ResolvedTimelineObject {
	instance: TimelineObjectInstance
}
export interface NextEvent {
	type: EventType
	time: Time
	objId: string
}
export interface ResolvedTimelineObjectInstanceKeyframe extends ResolvedTimelineObjectInstance {
	isKeyframe?: boolean
	keyframeEndTime?: TimeMaybe
}
export interface AllStates {
	[layer: string]: {
		[time: string]: ResolvedTimelineObjectInstanceKeyframe[] | null
	}
}
export interface StateInTime {
	[layer: string]: ResolvedTimelineObjectInstance
}
export interface TimeEvent {
	time: number
	/** true when the event indicate that something starts, false when something ends */
	enable: boolean
}

// Resolver ------------------------------------------------------------
export declare class Resolver {
	/**
	 * Go through all objects on the timeline and calculate all the timings.
	 * Returns a ResolvedTimeline which can be piped into Resolver.getState()
	 * @param timeline Array of timeline objects
	 * @param options Resolve options
	 */
	static resolveTimeline(timeline: Array<TimelineObject>, options: ResolveOptions): ResolvedTimeline
	/** Calculate the state for all points in time.  */
	static resolveAllStates(resolvedTimeline: ResolvedTimeline): ResolvedStates
	/**
	 * Calculate the state at a given point in time.
	 * Using a ResolvedTimeline calculated by Resolver.resolveTimeline() or
	 * a ResolvedStates calculated by Resolver.resolveAllStates()
	 * @param resolved ResolvedTimeline calculated by Resolver.resolveTimeline.
	 * @param time The point in time where to calculate the state
	 * @param eventLimit (Optional) Limits the number of returned upcoming events.
	 */
	static getState(resolved: ResolvedTimeline | ResolvedStates, time: Time, eventLimit?: number): TimelineState
}
export declare function resolveTimelineObj(resolvedTimeline: ResolvedTimeline, obj: ResolvedTimelineObject): void
declare type ObjectRefType = 'start' | 'end' | 'duration'
export declare function lookupExpression(
	resolvedTimeline: ResolvedTimeline,
	obj: TimelineObject,
	expr: Expression | null,
	context: ObjectRefType
): Array<TimelineObjectInstance> | ValueWithReference | null
