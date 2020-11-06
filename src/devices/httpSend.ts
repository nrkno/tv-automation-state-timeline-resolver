import _ from 'underscore'
import { DeviceWithState, CommandWithContext, DeviceStatus, StatusCode, IDevice } from './device'
import { DeviceType, HTTPSendOptions, HTTPSendCommandContent, DeviceOptionsHTTPSend, Mappings } from '../types/src'
import { DoOnTime, SendMode } from '../doOnTime'
import * as request from 'request'

import { TimelineState, ResolvedTimelineObjectInstance } from 'superfly-timeline'
export interface DeviceOptionsHTTPSendInternal extends DeviceOptionsHTTPSend {
	options: DeviceOptionsHTTPSend['options'] & { commandReceiver?: CommandReceiver }
}
export type CommandReceiver = (
	time: number,
	cmd: HTTPSendCommandContent,
	context: CommandContext,
	timelineObjId: string
) => Promise<any>
interface Command {
	commandName: 'added' | 'changed' | 'removed'
	content: HTTPSendCommandContent
	context: CommandContext
	timelineObjId: string
	layer: string
}
type CommandContext = string

type HTTPSendState = TimelineState

/**
 * This is a HTTPSendDevice, it sends http commands when it feels like it
 */
export class HTTPSendDevice extends DeviceWithState<HTTPSendState> implements IDevice {
	private _makeReadyCommands: HTTPSendCommandContent[] = []
	private _makeReadyDoesReset = false
	private _doOnTime: DoOnTime

	private _commandReceiver: CommandReceiver

	constructor(deviceId: string, deviceOptions: DeviceOptionsHTTPSendInternal, getCurrentTime: () => Promise<number>) {
		super(deviceId, deviceOptions, getCurrentTime)

		if (deviceOptions.options.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
		else this._commandReceiver = this._defaultCommandReceiver

		this._doOnTime = new DoOnTime(
			() => {
				return this.getCurrentTime()
			},
			SendMode.IN_ORDER,
			this._deviceOptions
		)
		this.handleDoOnTime(this._doOnTime, 'HTTPSend')
	}
	init(initOptions: HTTPSendOptions): Promise<boolean> {
		this._makeReadyCommands = initOptions.makeReadyCommands || []
		this._makeReadyDoesReset = initOptions.makeReadyDoesReset || false

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
		const oldState: TimelineState = (
			this.getStateBefore(previousStateTime) || { state: { time: 0, layers: {}, nextEvents: [] } }
		).state

		const oldHttpSendState = oldState
		const newHttpSendState = this.convertStateToHttpSend(newState)

		const commandsToAchieveState: Array<any> = this._diffStates(oldHttpSendState, newHttpSendState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)
		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newState, newState.time)
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
		return {
			statusCode: StatusCode.GOOD,
			active: this.isActive,
		}
	}
	async makeReady(okToDestroyStuff?: boolean): Promise<void> {
		if (okToDestroyStuff) {
			const time = this.getCurrentTime()

			if (this._makeReadyDoesReset) {
				this.clearStates()
				this._doOnTime.clearQueueAfter(0)
			}

			for (const cmd of this._makeReadyCommands || []) {
				await this._commandReceiver(time, cmd, 'makeReady', '')
			}
		}
	}

	get canConnect(): boolean {
		return false
	}
	get connected(): boolean {
		return false
	}
	convertStateToHttpSend(state: TimelineState) {
		// convert the timeline state into something we can use
		// (won't even use this.mapping)
		return state
	}
	get deviceType() {
		return DeviceType.HTTPSEND
	}
	get deviceName(): string {
		return 'HTTP-Send ' + this.deviceId
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
				cmd.content.queueId,
				(cmd: Command) => {
					if (cmd.commandName === 'added' || cmd.commandName === 'changed') {
						return this._commandReceiver(time, cmd.content, cmd.context, cmd.timelineObjId)
					} else {
						return null
					}
				},
				cmd
			)
		})
	}
	/**
	 * Compares the new timeline-state with the old one, and generates commands to account for the difference
	 */
	private _diffStates(oldhttpSendState: TimelineState, newhttpSendState: TimelineState): Array<Command> {
		// in this httpSend class, let's just cheat:

		const commands: Array<Command> = []

		_.each(newhttpSendState.layers, (newLayer: ResolvedTimelineObjectInstance, layerKey: string) => {
			const oldLayer = oldhttpSendState.layers[layerKey]
			if (!oldLayer) {
				// added!
				commands.push({
					timelineObjId: newLayer.id,
					commandName: 'added',
					content: newLayer.content as HTTPSendCommandContent,
					context: `added: ${newLayer.id}`,
					layer: layerKey,
				})
			} else {
				// changed?
				if (!_.isEqual(oldLayer.content, newLayer.content)) {
					// changed!
					commands.push({
						timelineObjId: newLayer.id,
						commandName: 'changed',
						content: newLayer.content as HTTPSendCommandContent,
						context: `changed: ${newLayer.id} (previously: ${oldLayer.id})`,
						layer: layerKey,
					})
				}
			}
		})
		// removed
		_.each(oldhttpSendState.layers, (oldLayer: ResolvedTimelineObjectInstance, layerKey) => {
			const newLayer = newhttpSendState.layers[layerKey]
			if (!newLayer) {
				// removed!
				commands.push({
					timelineObjId: oldLayer.id,
					commandName: 'removed',
					content: oldLayer.content as HTTPSendCommandContent,
					context: `removed: ${oldLayer.id}`,
					layer: layerKey,
				})
			}
		})
		return commands
			.sort((a, b) => a.layer.localeCompare(b.layer))
			.sort((a, b) => {
				return (a.content.temporalPriority || 0) - (b.content.temporalPriority || 0)
			})
	}
	private _defaultCommandReceiver(
		_time: number,
		cmd: HTTPSendCommandContent,
		context: CommandContext,
		timelineObjId: string
	): Promise<any> {
		const cwc: CommandWithContext = {
			context: context,
			command: cmd,
			timelineObjId: timelineObjId,
		}
		this.emit('debug', cwc)

		return new Promise((resolve, reject) => {
			const handleResponse = (error: Error, response: request.Response) => {
				if (error) {
					this.emit('error', `HTTPSend.response error ${cmd.type} (${context}`, error)
					reject(error)
				} else if (response.statusCode === 200) {
					this.emit(
						'debug',
						`HTTPSend: ${cmd.type}: Good statuscode response on url "${cmd.url}": ${response.statusCode} (${context})`
					)
					resolve()
				} else {
					this.emit(
						'warning',
						`HTTPSend: ${cmd.type}: Bad statuscode response on url "${cmd.url}": ${response.statusCode} (${context})`
					)
					resolve()
				}
			}

			// send the http request:
			const requestMethod = request[cmd.type]
			if (requestMethod) {
				requestMethod(cmd.url, { json: cmd.params }, handleResponse)
			} else {
				reject(`Unknown HTTP-send type: "${cmd.type}"`)
			}
		}).catch((error) => {
			this.emit('commandError', error, cwc)
		})
	}
}
