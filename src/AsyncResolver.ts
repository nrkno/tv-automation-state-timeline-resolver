import {
	Resolver,
	TimelineObject,
	ResolvedTimeline,
	ResolvedTimelineObject,
	ResolvedStates,
	ResolverCache
} from 'superfly-timeline'
import _ = require('underscore')
import {
	TimelineTriggerTimeResult
} from './conductor'
import { TSRTimeline, TSRTimelineObj } from './types/src'

const applyRecursively = (o: TimelineObject, func: (o: TimelineObject) => void) => {
	func(o)

	if (o.isGroup) {
		_.each(o.children || [], (child: TimelineObject) => {
			applyRecursively(child, func)
		})
	}
}

export class AsyncResolver {

	private readonly onSetTimelineTriggerTime: (res: TimelineTriggerTimeResult) => void

	private cache: ResolverCache = {}

	private _timeline: TSRTimeline = []
	private _resolvedStates: {
		resolvedStates: ResolvedStates | null,
		resolveTime: number
	} = {
		resolvedStates: null,
		resolveTime: 0
	}

	public constructor (onSetTimelineTriggerTime: (res: TimelineTriggerTimeResult) => void) {
		this.onSetTimelineTriggerTime = onSetTimelineTriggerTime
	}

	public async newTimeline (timeline: TSRTimeline) {
		this._timeline = timeline
		await this.resetResolvedState()
	}
	public async resetResolvedState () {
		this._resolvedStates = {
			resolvedStates: null,
			resolveTime: 0
		}
	}

	public async getState (resolveTime: number, limitTime: number, useCache: boolean) {
		const timeline = this._timeline
		// To prevent trying to transfer circular references over IPC we remove
		// any references to the parent property:
		const deleteParent = (o: TimelineObject) => { delete o['parent'] }
		_.each(timeline, (o) => applyRecursively(o, deleteParent))

		// Determine if we can use the pre-resolved timeline:
		let resolvedStates: ResolvedStates
		if (
			this._resolvedStates.resolvedStates &&
			resolveTime >= this._resolvedStates.resolveTime &&
			resolveTime < this._resolvedStates.resolveTime + limitTime
		) {
			// Yes, we can use the previously resolved timeline:
			resolvedStates = this._resolvedStates.resolvedStates
		} else {
			// No, we need to resolve the timeline again:
			const objectsFixed = this._fixNowObjects(timeline, resolveTime)

			const resolvedTimeline = Resolver.resolveTimeline(timeline, {
				limitCount: 999,
				limitTime: limitTime,
				time: resolveTime,
				cache: useCache ? this.cache : undefined
			})

			resolvedStates = Resolver.resolveAllStates(resolvedTimeline)

			this._resolvedStates.resolvedStates = resolvedStates
			this._resolvedStates.resolveTime = resolveTime

			// Apply changes to fixed objects (set "now" triggers to an actual time):
			// This gets persisted on this.timeline, so we only have to do this once
			const nowIdsTime: {[id: string]: number} = {}
			_.each(objectsFixed, (o) => nowIdsTime[o.id] = o.time)
			const fixNow = (o: TimelineObject) => {
				if (nowIdsTime[o.id]) {
					if (!_.isArray(o.enable)) {
						o.enable.start = nowIdsTime[o.id]
					}
				}
			}
			_.each(timeline, (o) => applyRecursively(o, fixNow))

		}

		const state = Resolver.getState(resolvedStates, resolveTime)
		return {
			...state,
			timelineLength: timeline.length
		}
	}

	private _fixNowObjects (timeline: TSRTimeline, now: number): TimelineTriggerTimeResult {
		let objectsFixed: Array<{
			id: string,
			time: number
		}> = []
		const timeLineMap: {[id: string]: TSRTimelineObj} = {}

		let setObjectTime = (o: TSRTimelineObj, time: number) => {
			if (!_.isArray(o.enable)) {
				o.enable.start = time // set the objects to "now" so that they are resolved correctly temporarily
				const o2 = timeLineMap[o.id]
				if (o2 && !_.isArray(o2.enable)) {
					o2.enable.start = time
				}

				objectsFixed.push({
					id: o.id,
					time: time
				})
			}
		}

		_.each(timeline, (obj) => {
			timeLineMap[obj.id] = obj
		})

		// First: fix the ones on the first level (i e not in groups), because they are easy (this also saves us one iteration time later):
		_.each(timeLineMap, (o: TSRTimelineObj) => {
			if (!_.isArray(o.enable)) {
				if (o.enable.start === 'now') {
					setObjectTime(o, now)
				}
			}
		})

		// Then, resolve the timeline to be able to set "now" inside groups, relative to parents:
		let dontIterateAgain: boolean = false
		let wouldLikeToIterateAgain: boolean = false

		let resolvedTimeline: ResolvedTimeline
		let fixObjects = (objs: TimelineObject[], parentObject?: TimelineObject) => {

			_.each(objs, (o: TSRTimelineObj) => {
				if (
					!_.isArray(o.enable) &&
					o.enable.start === 'now'
				) {
					// find parent, and set relative to that
					if (parentObject) {

						let resolvedParent: ResolvedTimelineObject = resolvedTimeline.objects[parentObject.id]

						let parentInstance = resolvedParent.resolved.instances[0]
						if (resolvedParent.resolved.resolved && parentInstance) {
							dontIterateAgain = false
							setObjectTime(o, now - (parentInstance.originalStart || parentInstance.start))
						} else {
							// the parent isn't found, it's probably not resolved (yet), try iterating once more:
							wouldLikeToIterateAgain = true
						}
					} else {
						// no parent object
						dontIterateAgain = false
						setObjectTime(o, now)
					}
				}
				if (o.isGroup && o.children) {
					fixObjects(o.children, o)
				}
			})
		}

		for (let i = 0; i < 10; i++) {
			wouldLikeToIterateAgain = false
			dontIterateAgain = true

			resolvedTimeline = Resolver.resolveTimeline(_.values(timeLineMap), {
				time: now
			})

			fixObjects(_.values(resolvedTimeline.objects))
			if (!wouldLikeToIterateAgain && dontIterateAgain) break
		}

		if (objectsFixed.length) {
			this.onSetTimelineTriggerTime(objectsFixed)
		}
		return objectsFixed
	}
}
