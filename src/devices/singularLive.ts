import _ from 'underscore'
import { DeviceWithState, CommandWithContext, DeviceStatus, StatusCode, literal, IDevice } from './device'
import {
	DeviceType,
	SingularLiveOptions,
	TimelineContentTypeSingularLive,
	MappingSingularLive,
	TimelineObjSingularLiveAny,
	DeviceOptionsSingularLive,
	SingularCompositionAnimation,
	SingularCompositionControlNode,
	Mappings,
} from '../types/src'
import { DoOnTime, SendMode } from '../doOnTime'
import * as request from 'request'

import { TimelineState, ResolvedTimelineObjectInstance } from 'superfly-timeline'
export interface DeviceOptionsSingularLiveInternal extends DeviceOptionsSingularLive {
	options: DeviceOptionsSingularLive['options'] & { commandReceiver?: CommandReceiver }
}
export type CommandReceiver = (
	time: number,
	cmd: SingularLiveCommandContent,
	context: CommandContext,
	timelineObjId: string
) => Promise<any>

export interface SingularLiveAnimationCommandContent extends SingularLiveCommandContent {
	animation: {
		action: 'play' | 'jump'
		to: 'In' | 'Out'
	}
}

export interface SingularLiveControlNodeCommandContent extends SingularLiveCommandContent {
	controlNode: {
		payload: { [key: string]: string }
	}
}

export interface SingularLiveCommandContent {
	compositionName: string
}

interface Command {
	commandName: 'added' | 'changed' | 'removed'
	content: SingularLiveCommandContent
	context: CommandContext
	timelineObjId: string
	layer: string
}
export type CommandContext = string

export interface SingularComposition {
	timelineObjId: string
	animation: SingularCompositionAnimation
	controlNode: SingularCompositionControlNode
}

export interface SingularLiveState {
	compositions: {
		[key: string]: SingularComposition
	}
}

const SINGULAR_LIVE_API = 'https://app.singular.live/apiv1/control/'

/**
 * This is a Singular.Live device, it talks to a Singular.Live App Instance using an Access Token
 */
export class SingularLiveDevice extends DeviceWithState<SingularLiveState> implements IDevice {
	// private _makeReadyCommands: SingularLiveCommandContent[]
	private _accessToken: string
	private _doOnTime: DoOnTime
	private _deviceStatus: DeviceStatus = {
		statusCode: StatusCode.GOOD,
		active: this.isActive,
	}

	private _commandReceiver: CommandReceiver

	constructor(
		deviceId: string,
		deviceOptions: DeviceOptionsSingularLiveInternal,
		getCurrentTime: () => Promise<number>
	) {
		super(deviceId, deviceOptions, getCurrentTime)
		if (deviceOptions.options?.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
		else this._commandReceiver = this._defaultCommandReceiver

		this._doOnTime = new DoOnTime(
			() => {
				return this.getCurrentTime()
			},
			SendMode.IN_ORDER,
			this._deviceOptions
		)
		this.handleDoOnTime(this._doOnTime, 'SingularLive')

		this._accessToken = deviceOptions.options.accessToken
	}
	init(initOptions: SingularLiveOptions): Promise<boolean> {
		// this._makeReadyCommands = options.makeReadyCommands || []
		this._accessToken = initOptions.accessToken || ''

		if (!this._accessToken)
			throw new Error('Singular.Live bad connection option: accessToken. An accessToken is required.')

		return Promise.resolve(true) // This device doesn't have any initialization procedure
	}
	/** Called by the Conductor a bit before a .handleState is called */
	prepareForHandleState(newStateTime: number) {
		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(newStateTime)
		this.cleanUpStates(0, newStateTime)
	}
	handleState(newState: TimelineState, newMappings: Mappings) {
		super.onHandleState(newState, newMappings)
		// Handle this new state, at the point in time specified

		const previousStateTime = Math.max(this.getCurrentTime(), newState.time)
		const oldSingularState: SingularLiveState = (
			this.getStateBefore(previousStateTime) || { state: { compositions: {} } }
		).state

		const newSingularState = this.convertStateToSingularLive(newState, newMappings)

		const commandsToAchieveState: Array<any> = this._diffStates(oldSingularState, newSingularState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)
		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newSingularState, newState.time)
	}
	clearFuture(clearAfterTime: number) {
		// Clear any scheduled commands after this time
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}
	terminate() {
		this._doOnTime.dispose()
		return Promise.resolve(true)
	}
	getStatus(): DeviceStatus {
		// Good, since this device has no status, really
		return this._deviceStatus
	}
	async makeReady(_okToDestroyStuff?: boolean): Promise<void> {
		// if (okToDestroyStuff && this._makeReadyCommands && this._makeReadyCommands.length > 0) {
		// 	const time = this.getCurrentTime()
		// 	_.each(this._makeReadyCommands, (cmd: SingularLiveCommandContent) => {
		// 		// add the new commands to the queue:
		// 		this._doOnTime.queue(time, undefined, (cmd: SingularLiveCommandContent) => {
		// 			return this._commandReceiver(time, cmd, 'makeReady', '')
		// 		}, cmd)
		// 	})
		// }
	}

	get canConnect(): boolean {
		return false
	}
	get connected(): boolean {
		return false
	}
	private _getDefaultState(): SingularLiveState {
		return {
			compositions: {},
		}
	}
	convertStateToSingularLive(state: TimelineState, newMappings: Mappings) {
		// convert the timeline state into something we can use
		// (won't even use this.mapping)
		const singularState: SingularLiveState = this._getDefaultState()

		_.each(state.layers, (tlObject: ResolvedTimelineObjectInstance, layerName: string) => {
			const mapping: MappingSingularLive | undefined = newMappings[layerName] as MappingSingularLive
			if (mapping && mapping.device === DeviceType.SINGULAR_LIVE && mapping.deviceId === this.deviceId) {
				const tlObjectSource = (tlObject as any) as TimelineObjSingularLiveAny

				if (tlObjectSource.content.type === TimelineContentTypeSingularLive.COMPOSITION) {
					singularState.compositions[mapping.compositionName] = {
						timelineObjId: tlObject.id,

						controlNode: tlObjectSource.content.controlNode,
						animation: tlObjectSource.content.animation || { action: 'play' },
					}
				}
			}
		})

		return singularState
	}
	get deviceType() {
		return DeviceType.SINGULAR_LIVE
	}
	get deviceName(): string {
		return 'Singular.Live ' + this.deviceId
	}
	get queue() {
		return this._doOnTime.getQueue()
	}
	/**
	 * Add commands to queue, to be executed at the right time
	 */
	private _addToQueue(commandsToAchieveState: Array<Command>, time: number) {
		_.each(commandsToAchieveState, (cmd: Command) => {
			// add the new commands to the queue:
			this._doOnTime.queue(
				time,
				undefined,
				(cmd: Command) => {
					return this._commandReceiver(time, cmd.content, cmd.context, cmd.timelineObjId)
				},
				cmd
			)
		})
	}
	/**
	 * Compares the new timeline-state with the old one, and generates commands to account for the difference
	 */
	private _diffStates(
		oldSingularLiveState: SingularLiveState,
		newSingularLiveState: SingularLiveState
	): Array<Command> {
		const commands: Array<Command> = []

		_.each(newSingularLiveState.compositions, (composition: SingularComposition, compositionName: string) => {
			const oldComposition = oldSingularLiveState.compositions[compositionName]
			if (!oldComposition) {
				// added!
				commands.push({
					timelineObjId: composition.timelineObjId,
					commandName: 'added',
					content: literal<SingularLiveAnimationCommandContent>({
						compositionName: compositionName,
						animation: {
							action: composition.animation.action,
							to: 'In',
						},
					}),
					context: `added: ${composition.timelineObjId}`,
					layer: compositionName,
				})
				commands.push({
					timelineObjId: composition.timelineObjId,
					commandName: 'added',
					content: literal<SingularLiveControlNodeCommandContent>({
						compositionName: compositionName,
						controlNode: {
							payload: composition.controlNode.payload,
						},
					}),
					context: `added: ${composition.timelineObjId}`,
					layer: compositionName,
				})
			} else {
				// changed?
				if (!_.isEqual(oldComposition.controlNode, composition.controlNode)) {
					// changed!
					commands.push({
						timelineObjId: composition.timelineObjId,
						commandName: 'changed',
						content: literal<SingularLiveControlNodeCommandContent>({
							compositionName: compositionName,
							controlNode: {
								payload: composition.controlNode.payload,
							},
						}),
						context: `changed: ${composition.timelineObjId}  (previously: ${oldComposition.timelineObjId})`,
						layer: compositionName,
					})
				}
			}
		})
		// removed
		_.each(oldSingularLiveState.compositions, (composition: SingularComposition, compositionName) => {
			const newComposition = newSingularLiveState.compositions[compositionName]
			if (!newComposition) {
				// removed!
				commands.push({
					timelineObjId: composition.timelineObjId,
					commandName: 'removed',
					content: literal<SingularLiveAnimationCommandContent>({
						compositionName: compositionName,
						animation: {
							action: composition.animation.action,
							to: 'Out',
						},
					}),
					context: `removed: ${composition.timelineObjId}`,
					layer: compositionName,
				})
			}
		})
		return commands
			.sort((a, b) =>
				(a.content as any).controlNode && !(b.content as any).controlNode
					? 1
					: !(a.content as any).controlNode && (b.content as any).controlNode
					? -1
					: 0
			)
			.sort((a, b) => a.layer.localeCompare(b.layer))
	}
	private _defaultCommandReceiver(
		_time: number,
		cmd: SingularLiveCommandContent,
		context: CommandContext,
		timelineObjId: string
	): Promise<any> {
		const cwc: CommandWithContext = {
			context: context,
			command: cmd,
			timelineObjId: timelineObjId,
		}
		this.emit('debug', cwc)

		const url = SINGULAR_LIVE_API + this._accessToken

		return new Promise((resolve, reject) => {
			const handleResponse = (error: Error, response: request.Response) => {
				if (error) {
					this.emit('error', `SingularLive.response error ${cmd.compositionName} (${context}`, error)
					reject(error)
				} else if (response.statusCode === 200) {
					this.emit(
						'debug',
						`SingularLive: ${cmd.compositionName}: Good statuscode response on url "${url}": ${response.statusCode} (${context})`
					)
					resolve()
				} else {
					this.emit(
						'warning',
						`SingularLive: ${cmd.compositionName}: Bad statuscode response on url "${url}": ${response.statusCode} (${context})`
					)
					resolve()
				}
			}

			request.put(url, { json: [cmd] }, handleResponse)
		}).catch((error) => {
			this.emit('commandError', error, cwc)
		})
	}
}
