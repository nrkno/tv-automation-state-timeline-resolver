import {
	Resolver,
	TimelineObject,
	ResolvedTimeline,
	ResolvedTimelineObject,
	ResolvedStates,
	ResolverCache,
} from 'superfly-timeline'
import _ = require('underscore')
import { TimelineTriggerTimeResult } from './conductor'
import { TSRTimeline, TSRTimelineObj } from './types/src'

export class AsyncResolver {
	private readonly onSetTimelineTriggerTime: (res: TimelineTriggerTimeResult) => void

	private cache: ResolverCache = {}

	public constructor(onSetTimelineTriggerTime: (res: TimelineTriggerTimeResult) => void) {
		this.onSetTimelineTriggerTime = onSetTimelineTriggerTime
	}

	public async resolveTimeline(resolveTime: number, timeline: TSRTimeline, limitTime: number, useCache: boolean) {
		const objectsFixed = this._fixNowObjects(timeline, resolveTime)

		const resolvedTimeline = Resolver.resolveTimeline(timeline, {
			limitCount: 999,
			limitTime: limitTime,
			time: resolveTime,
			cache: useCache ? this.cache : undefined,
		})

		const resolvedStates = Resolver.resolveAllStates(resolvedTimeline)

		return {
			resolvedStates,
			objectsFixed,
		}
	}
	public async getState(resolved: ResolvedStates, resolveTime: number) {
		return Resolver.getState(resolved, resolveTime)
	}

	private _fixNowObjects(timeline: TSRTimeline, now: number): TimelineTriggerTimeResult {
		const objectsFixed: Array<{
			id: string
			time: number
		}> = []
		const timeLineMap: { [id: string]: TSRTimelineObj } = {}

		const setObjectTime = (o: TSRTimelineObj, time: number) => {
			if (!_.isArray(o.enable)) {
				o.enable.start = time // set the objects to "now" so that they are resolved correctly temporarily
				const o2 = timeLineMap[o.id]
				if (o2 && !_.isArray(o2.enable)) {
					o2.enable.start = time
				}

				objectsFixed.push({
					id: o.id,
					time: time,
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
		let dontIterateAgain = false
		let wouldLikeToIterateAgain = false

		let resolvedTimeline: ResolvedTimeline
		const fixObjects = (objs: TimelineObject[], parentObject?: TimelineObject) => {
			_.each(objs, (o: TSRTimelineObj) => {
				if (!_.isArray(o.enable) && o.enable.start === 'now') {
					// find parent, and set relative to that
					if (parentObject) {
						const resolvedParent: ResolvedTimelineObject = resolvedTimeline.objects[parentObject.id]

						const parentInstance = resolvedParent.resolved.instances[0]
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
				time: now,
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
