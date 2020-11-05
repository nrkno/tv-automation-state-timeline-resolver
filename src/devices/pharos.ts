import _ from 'underscore'
import { DeviceWithState, CommandWithContext, DeviceStatus, StatusCode, IDevice } from './device'
import {
	DeviceType,
	PharosOptions,
	TimelineContentTypePharos,
	TimelineObjPharos,
	TimelineObjPharosScene,
	TimelineObjPharosTimeline,
	DeviceOptionsPharos,
	Mappings,
} from '../types/src'

import { TimelineState, ResolvedTimelineObjectInstance } from 'superfly-timeline'
import { DoOnTime, SendMode } from '../doOnTime'
import { Pharos, ProjectInfo } from './pharosAPI'

export interface DeviceOptionsPharosInternal extends DeviceOptionsPharos {
	options: DeviceOptionsPharos['options'] & { commandReceiver?: CommandReceiver }
}
export type CommandReceiver = (
	time: number,
	cmd: Command,
	context: CommandContext,
	timelineObjId: string
) => Promise<any>
export interface Command {
	content: CommandContent
	context: CommandContext
	timelineObjId: string
}
export interface PharosState extends TimelineState {
	Layers: {
		[Layer: string]: TimelineObjPharos
	}
}

interface CommandContent {
	fcn: (...args: any[]) => Promise<any>
	args: any[]
}
type CommandContext = string
/**
 * This is a wrapper for a Pharos-devices,
 * https://www.pharoscontrols.com/downloads/documentation/application-notes/
 */
export class PharosDevice extends DeviceWithState<PharosState> implements IDevice {
	private _doOnTime: DoOnTime

	private _pharos: Pharos
	private _pharosProjectInfo?: ProjectInfo

	private _commandReceiver: CommandReceiver

	constructor(deviceId: string, deviceOptions: DeviceOptionsPharosInternal, getCurrentTime: () => Promise<number>) {
		super(deviceId, deviceOptions, getCurrentTime)
		if (deviceOptions.options?.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
		else this._commandReceiver = this._defaultCommandReceiver

		this._doOnTime = new DoOnTime(
			() => {
				return this.getCurrentTime()
			},
			SendMode.BURST,
			this._deviceOptions
		)
		this.handleDoOnTime(this._doOnTime, 'Pharos')

		this._pharos = new Pharos()

		this._pharos.on('error', (e) => this.emit('error', 'Pharos', e))
		this._pharos.on('connected', () => {
			this._connectionChanged()
		})
		this._pharos.on('disconnected', () => {
			this._connectionChanged()
		})
	}

	/**
	 * Initiates the connection with Pharos through the PharosAPI.
	 */
	init(initOptions: PharosOptions): Promise<boolean> {
		return new Promise((resolve, reject) => {
			// This is where we would do initialization, like connecting to the devices, etc
			this._pharos
				.connect(initOptions)
				.then(() => {
					return this._pharos.getProjectInfo()
				})
				.then((systemInfo) => {
					this._pharosProjectInfo = systemInfo
				})
				.then(() => resolve(true))
				.catch((e) => reject(e))
		})
	}
	/** Called by the Conductor a bit before a .handleState is called */
	prepareForHandleState(newStateTime: number) {
		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(newStateTime)
		this.cleanUpStates(0, newStateTime)
	}
	/**
	 * Handles a new state such that the device will be in that state at a specific point
	 * in time.
	 * @param newState
	 */
	handleState(newState: TimelineState, newMappings: Mappings) {
		super.onHandleState(newState, newMappings)
		// Handle this new state, at the point in time specified

		const previousStateTime = Math.max(this.getCurrentTime(), newState.time)
		const oldPharosState: PharosState = (
			this.getStateBefore(previousStateTime) || { state: { Layers: {}, time: 0, layers: {}, nextEvents: [] } }
		).state

		const newPharosState = this.convertStateToPharos(newState)

		const commandsToAchieveState: Array<Command> = this._diffStates(oldPharosState, newPharosState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)
		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newPharosState, newState.time)
	}
	clearFuture(clearAfterTime: number) {
		// Clear any scheduled commands after this time
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}
	terminate() {
		this._doOnTime.dispose()
		return this._pharos.dispose().then(() => {
			return true
		})
	}
	get canConnect(): boolean {
		return true
	}
	get connected(): boolean {
		return this._pharos.connected
	}
	convertStateToPharos(state: TimelineState): PharosState {
		return state as PharosState
	}
	get deviceType() {
		return DeviceType.PHAROS
	}
	get deviceName(): string {
		return 'Pharos ' + this.deviceId + (this._pharosProjectInfo ? ', ' + this._pharosProjectInfo.name : '')
	}
	get queue() {
		return this._doOnTime.getQueue()
	}
	async makeReady(okToDestroyStuff?: boolean): Promise<void> {
		if (okToDestroyStuff) {
			this._doOnTime.clearQueueNowAndAfter(this.getCurrentTime())
		}
	}
	getStatus(): DeviceStatus {
		let statusCode = StatusCode.GOOD
		const messages: Array<string> = []

		if (!this._pharos.connected) {
			statusCode = StatusCode.BAD
			messages.push('Not connected')
		}

		return {
			statusCode: statusCode,
			messages: messages,
			active: this.isActive,
		}
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
					return this._commandReceiver(time, cmd, cmd.context, cmd.timelineObjId)
				},
				cmd
			)
		})
	}
	/**
	 * Compares the new timeline-state with the old one, and generates commands to account for the difference
	 */
	private _diffStates(oldPharosState: PharosState, newPharosState: PharosState) {
		const commands: Array<Command> = []
		const stoppedLayers: { [layerKey: string]: true } = {}

		const stopLayer = (oldLayer: TimelineObjPharos, reason?: string) => {
			if (stoppedLayers[oldLayer.id]) return // don't send several remove commands for the same object

			if (oldLayer.content.noRelease) return // override: don't stop / release

			stoppedLayers[oldLayer.id] = true

			if (oldLayer.content.type === TimelineContentTypePharos.SCENE) {
				const oldScene = oldLayer as TimelineObjPharosScene

				if (!reason) reason = 'removed scene'
				commands.push({
					content: {
						args: [oldScene.content.scene, oldScene.content.fade],
						fcn: (scene, fade) => this._pharos.releaseScene(scene, fade),
					},
					context: `${reason}: ${oldLayer.id} ${oldScene.content.scene}`,
					timelineObjId: oldLayer.id,
				})
			} else if (oldLayer.content.type === TimelineContentTypePharos.TIMELINE) {
				const oldTimeline = oldLayer as TimelineObjPharosTimeline

				if (!reason) reason = 'removed timeline'
				commands.push({
					content: {
						args: [oldTimeline.content.timeline, oldTimeline.content.fade],
						fcn: (timeline, fade) => this._pharos.releaseTimeline(timeline, fade),
					},
					context: `${reason}: ${oldLayer.id} ${oldTimeline.content.timeline}`,
					timelineObjId: oldLayer.id,
				})
			}
		}
		const modifyTimelinePlay = (newLayer: TimelineObjPharos, oldLayer?: TimelineObjPharos) => {
			if (newLayer.content.type === TimelineContentTypePharos.TIMELINE) {
				const newPharosTimeline = newLayer as TimelineObjPharosTimeline
				const oldPharosTimeline = oldLayer as TimelineObjPharosTimeline

				if ((newPharosTimeline.content.pause || false) !== (oldPharosTimeline.content.pause || false)) {
					if (newPharosTimeline.content.pause) {
						commands.push({
							content: {
								args: [newPharosTimeline.content.timeline],
								fcn: (timeline) => this._pharos.pauseTimeline(timeline),
							},
							context: `pause timeline: ${newLayer.id} ${newPharosTimeline.content.timeline}`,
							timelineObjId: newLayer.id,
						})
					} else {
						commands.push({
							content: {
								args: [newPharosTimeline.content.timeline],
								fcn: (timeline) => this._pharos.resumeTimeline(timeline),
							},
							context: `resume timeline: ${newLayer.id} ${newPharosTimeline.content.timeline}`,
							timelineObjId: newLayer.id,
						})
					}
				}
				if ((newPharosTimeline.content.rate || null) !== (oldPharosTimeline.content.rate || null)) {
					commands.push({
						content: {
							args: [newPharosTimeline.content.timeline, newPharosTimeline.content.rate],
							fcn: (timeline, rate) => this._pharos.setTimelineRate(timeline, rate),
						},
						context: `pause timeline: ${newLayer.id} ${newPharosTimeline.content.timeline}: ${newPharosTimeline.content.rate}`,
						timelineObjId: newLayer.id,
					})
				}
				// @todo: support pause / setTimelinePosition
			}
		}
		const startLayer = (newLayer: TimelineObjPharos, reason?: string) => {
			if (!newLayer.content.stopped) {
				if (newLayer.content.type === TimelineContentTypePharos.SCENE) {
					const newPharosScene = newLayer as TimelineObjPharosScene

					if (!reason) reason = 'added scene'
					commands.push({
						content: {
							args: [newPharosScene.content.scene],
							fcn: (scene) => this._pharos.startScene(scene),
						},
						context: `${reason}: ${newLayer.id} ${newPharosScene.content.scene}`,
						timelineObjId: newLayer.id,
					})
				} else if (newLayer.content.type === TimelineContentTypePharos.TIMELINE) {
					const newPharosTimeline = newLayer as TimelineObjPharosTimeline
					if (!reason) reason = 'added timeline'
					commands.push({
						content: {
							args: [newPharosTimeline.content.timeline],
							fcn: (timeline) => this._pharos.startTimeline(timeline),
						},
						context: `${reason}: ${newLayer.id} ${newPharosTimeline.content.timeline}`,
						timelineObjId: newLayer.id,
					})
					modifyTimelinePlay(newLayer)
				}
			} else {
				// Item is set to "stopped"
				stopLayer(newLayer)
			}
		}

		// Added / Changed things:
		_.each(newPharosState.layers, (newLayer: ResolvedTimelineObjectInstance, layerKey) => {
			const oldPharosObj = (oldPharosState.layers[layerKey] as any) as TimelineObjPharos | undefined

			const pharosObj = (newLayer as any) as TimelineObjPharos

			if (!oldPharosObj) {
				// item is new
				startLayer(pharosObj)
			} else {
				// item is not new, but maybe it has changed:
				if (
					pharosObj.content.type !== oldPharosObj.content.type || // item has changed type!
					(pharosObj.content.stopped || false) !== (oldPharosObj.content.stopped || false) // item has stopped / unstopped
				) {
					if (!oldPharosObj.content.stopped) {
						// If it was stopped before, we don't have to stop it now:
						stopLayer(oldPharosObj)
					}
					startLayer(pharosObj)
				} else {
					if (pharosObj.content.type === TimelineContentTypePharos.SCENE) {
						const pharosObjScene = pharosObj as TimelineObjPharosScene
						const oldPharosObjScene = oldPharosObj as TimelineObjPharosScene
						if (pharosObjScene.content.scene !== oldPharosObjScene.content.scene) {
							// scene has changed
							stopLayer(oldPharosObj, 'scene changed from')
							startLayer(pharosObj, 'scene changed to')
						}
					} else if (pharosObj.content.type === TimelineContentTypePharos.TIMELINE) {
						const pharosObjTimeline = pharosObj as TimelineObjPharosTimeline
						const oldPharosObjTimeline = oldPharosObj as TimelineObjPharosTimeline
						if (pharosObjTimeline.content.timeline !== oldPharosObjTimeline.content.timeline) {
							// timeline has changed
							stopLayer(oldPharosObj, 'timeline changed from')
							startLayer(pharosObj, 'timeline changed to')
						} else {
							modifyTimelinePlay(pharosObj, oldPharosObj)
						}
					}
				}
			}
		})
		// Removed things
		_.each(oldPharosState.layers, (oldLayer: ResolvedTimelineObjectInstance, layerKey) => {
			const oldPharosObj = (oldLayer as any) as TimelineObjPharos

			const newLayer = newPharosState.layers[layerKey]
			if (!newLayer) {
				// removed item
				stopLayer(oldPharosObj)
			}
		})

		return commands
	}
	private async _defaultCommandReceiver(
		_time: number,
		cmd: Command,
		context: CommandContext,
		timelineObjId: string
	): Promise<any> {
		// emit the command to debug:
		const cwc: CommandWithContext = {
			context: context,
			command: {
				// commandName: cmd.content.args,
				args: cmd.content.args,
				// content: cmd.content
			},
			timelineObjId: timelineObjId,
		}
		this.emit('debug', cwc)

		// execute the command here
		try {
			await cmd.content.fcn(...cmd.content.args)
		} catch (e) {
			this.emit('commandError', e, cwc)
		}
	}
	private _connectionChanged() {
		this.emit('connectionChanged', this.getStatus())
	}
}
