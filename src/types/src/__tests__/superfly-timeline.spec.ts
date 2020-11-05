import _ from 'underscore'
import * as Original from 'superfly-timeline'
import * as Local from '../superfly-timeline'

const LocalEnums = {
	EventType: Local.EventType,
}
const OriginalEnums = {
	EventType: Original.EventType,
}
describe('superfly-timeline', () => {
	test('Enums', () => {
		_.each(LocalEnums as any, (e: any, enumName: string) => {
			const originalEnum = OriginalEnums[enumName]

			expect(e).toBeTruthy()
			expect(originalEnum).toBeTruthy()

			_.each(e, (value: any, key: string) => {
				expect(value).toEqual(originalEnum[key])
			})
		})
	})
	test('Enumarable types', () => {
		_.each(Local, (type: any, typeName: string) => {
			const originalType = Original[typeName]
			if (_.isFunction(type)) {
				expect(_.isFunction(originalType)).toBeTruthy()
			} else {
				expect(type).toMatchObject(originalType)
			}
		})
	})
	test('Types', () => {
		function returnType<A>(): A {
			// nothing
			return
		}
		// Note: these checks are not caught by the test, but by the type-check

		// Check that types are the same:
		;[
			// Check that local interfaces matches original

			(): Original.Time => returnType<Local.Time>(),
			(): Original.Duration => returnType<Local.Duration>(),
			(): Original.TimeMaybe => returnType<Local.TimeMaybe>(),
			(): Original.DurationMaybe => returnType<Local.DurationMaybe>(),
			(): Original.ObjectId => returnType<Local.ObjectId>(),
			(): Original.Times => returnType<Local.Times>(),
			(): Original.ResolveOptions => returnType<Local.ResolveOptions>(),
			(): Original.TimelineObject => returnType<Local.TimelineObject>(),
			(): Original.Content => returnType<Local.Content>(),
			(): Original.TimelineEnable => returnType<Local.TimelineEnable>(),
			(): Original.TimelineKeyframe => returnType<Local.TimelineKeyframe>(),
			(): Original.TimelineObjectKeyframe => returnType<Local.TimelineObjectKeyframe>(),
			(): Original.ResolvedTimeline => returnType<Local.ResolvedTimeline>(),
			(): Original.ResolvedTimelineObjects => returnType<Local.ResolvedTimelineObjects>(),
			(): Original.ResolvedTimelineObject => returnType<Local.ResolvedTimelineObject>(),
			(): Original.TimelineObjectInstance => returnType<Local.TimelineObjectInstance>(),
			(): Original.Cap => returnType<Local.Cap>(),
			(): Original.ValueWithReference => returnType<Local.ValueWithReference>(),
			(): Original.InstanceEvent => returnType<Local.InstanceEvent>(),
			(): Original.Expression => returnType<Local.Expression>(),
			(): Original.ExpressionObj => returnType<Local.ExpressionObj>(),
			(): Original.ExpressionEvent => returnType<Local.ExpressionEvent>(),
			(): Original.ResolvedExpression => returnType<Local.ResolvedExpression>(),
			(): Original.ResolvedExpressionObj => returnType<Local.ResolvedExpressionObj>(),
			(): Original.TimelineState => returnType<Local.TimelineState>(),
			(): Original.ResolvedStates => returnType<Local.ResolvedStates>(),
			(): Original.ResolvedTimelineObjectInstance => returnType<Local.ResolvedTimelineObjectInstance>(),
			(): Original.NextEvent => returnType<Local.NextEvent>(),
			(): Original.ResolvedTimelineObjectInstanceKeyframe =>
				returnType<Local.ResolvedTimelineObjectInstanceKeyframe>(),
			(): Original.AllStates => returnType<Local.AllStates>(),
			(): Original.StateInTime => returnType<Local.StateInTime>(),
			(): Original.TimeEvent => returnType<Local.TimeEvent>(),
			(): Original.Resolver => returnType<Local.Resolver>(),

			// Check that original interfaces matches local
			(): Local.Time => returnType<Original.Time>(),
			(): Local.Duration => returnType<Original.Duration>(),
			(): Local.TimeMaybe => returnType<Original.TimeMaybe>(),
			(): Local.DurationMaybe => returnType<Original.DurationMaybe>(),
			(): Local.ObjectId => returnType<Original.ObjectId>(),
			(): Local.Times => returnType<Original.Times>(),
			(): Local.ResolveOptions => returnType<Original.ResolveOptions>(),
			(): Local.TimelineObject => returnType<Original.TimelineObject>(),
			(): Local.Content => returnType<Original.Content>(),
			(): Local.TimelineEnable => returnType<Original.TimelineEnable>(),
			(): Local.TimelineKeyframe => returnType<Original.TimelineKeyframe>(),
			(): Local.TimelineObjectKeyframe => returnType<Original.TimelineObjectKeyframe>(),
			(): Local.ResolvedTimeline => returnType<Original.ResolvedTimeline>(),
			(): Local.ResolvedTimelineObjects => returnType<Original.ResolvedTimelineObjects>(),
			(): Local.ResolvedTimelineObject => returnType<Original.ResolvedTimelineObject>(),
			(): Local.TimelineObjectInstance => returnType<Original.TimelineObjectInstance>(),
			(): Local.Cap => returnType<Original.Cap>(),
			(): Local.ValueWithReference => returnType<Original.ValueWithReference>(),
			(): Local.InstanceEvent => returnType<Original.InstanceEvent>(),
			(): Local.Expression => returnType<Original.Expression>(),
			(): Local.ExpressionObj => returnType<Original.ExpressionObj>(),
			(): Local.ExpressionEvent => returnType<Original.ExpressionEvent>(),
			(): Local.ResolvedExpression => returnType<Original.ResolvedExpression>(),
			(): Local.ResolvedExpressionObj => returnType<Original.ResolvedExpressionObj>(),
			(): Local.TimelineState => returnType<Original.TimelineState>(),
			(): Local.ResolvedStates => returnType<Original.ResolvedStates>(),
			(): Local.ResolvedTimelineObjectInstance => returnType<Original.ResolvedTimelineObjectInstance>(),
			(): Local.NextEvent => returnType<Original.NextEvent>(),
			(): Local.ResolvedTimelineObjectInstanceKeyframe =>
				returnType<Original.ResolvedTimelineObjectInstanceKeyframe>(),
			(): Local.AllStates => returnType<Original.AllStates>(),
			(): Local.StateInTime => returnType<Original.StateInTime>(),
			(): Local.TimeEvent => returnType<Original.TimeEvent>(),
			(): Local.Resolver => returnType<Original.Resolver>(),
		]

		expect(1).toEqual(1)
	})
})
