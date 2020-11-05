import _ from 'underscore'
import { EventEmitter } from 'events'
import { DeviceWithState, CommandWithContext, DeviceStatus, StatusCode, IDevice, literal } from './device'

import {
	DeviceType,
	Mapping,
	VizMSEOptions,
	ResolvedTimelineObjectInstanceExtended,
	TimelineObjVIZMSEElementInternal,
	TimelineContentTypeVizMSE,
	TimelineObjVIZMSEElementPilot,
	ExpectedPlayoutItemContent,
	VIZMSEPlayoutItemContent,
	DeviceOptionsVizMSE,
	TimelineObjVIZMSEAny,
	VIZMSEOutTransition,
	VIZMSETransitionType,
	Mappings,
} from '../types/src'

import { TimelineState, ResolvedTimelineObjectInstance } from 'superfly-timeline'

import { createMSE, MSE, VRundown, InternalElement, ExternalElement, VElement, VProfile, VizEngine } from 'v-connection'

import { DoOnTime, SendMode } from '../doOnTime'

import * as crypto from 'crypto'
import * as net from 'net'

/** The ideal time to prepare elements before going on air */
const IDEAL_PREPARE_TIME = 1000
/** Minimum time to wait after preparing elements */
const PREPARE_TIME_WAIT = 50

// How often to check / preload elements
const MONITOR_INTERVAL = 5 * 1000

// How long to wait after any action (takes, cues, etc) before trying to cue for preloading
const SAFE_PRELOAD_TIME = 2000

// How long to wait before retrying to ping the MSE when initializing the rundown, after a failed attempt
const INIT_RETRY_INTERVAL = 3000

export function getHash(str: string): string {
	const hash = crypto.createHash('sha1')
	return hash.update(str).digest('base64').replace(/[+/=]/g, '_') // remove +/= from strings, because they cause troubles
}

export interface DeviceOptionsVizMSEInternal extends DeviceOptionsVizMSE {
	options: DeviceOptionsVizMSE['options'] & { commandReceiver?: CommandReceiver }
}
export type CommandReceiver = (time: number, cmd: VizMSECommand, context: string, timelineObjId: string) => Promise<any>
/**
 * This class is used to interface with a vizRT Media Sequence Editor, through the v-connection library.
 * It features playing both "internal" graphics element and vizPilot elements.
 */
export class VizMSEDevice extends DeviceWithState<VizMSEState> implements IDevice {
	private _vizMSE?: MSE
	private _vizmseManager?: VizMSEManager

	private _commandReceiver: CommandReceiver

	private _doOnTime: DoOnTime
	private _doOnTimeBurst: DoOnTime
	private _initOptions?: VizMSEOptions
	private _vizMSEConnected = false

	constructor(deviceId: string, deviceOptions: DeviceOptionsVizMSEInternal, getCurrentTime: () => Promise<number>) {
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
		this.handleDoOnTime(this._doOnTime, 'VizMSE')

		this._doOnTimeBurst = new DoOnTime(
			() => {
				return this.getCurrentTime()
			},
			SendMode.BURST,
			this._deviceOptions
		)
		this.handleDoOnTime(this._doOnTimeBurst, 'VizMSE.burst')
	}

	async init(initOptions: VizMSEOptions): Promise<boolean> {
		this._initOptions = initOptions
		if (!this._initOptions.host) throw new Error('VizMSE bad option: host')
		if (!this._initOptions.showID) throw new Error('VizMSE bad option: showID')
		if (!this._initOptions.profile) throw new Error('VizMSE bad option: profile')

		this._vizMSE = createMSE(this._initOptions.host, this._initOptions.restPort, this._initOptions.wsPort)

		this._vizmseManager = new VizMSEManager(
			this,
			this._vizMSE,
			this._initOptions.preloadAllElements,
			this._initOptions.autoLoadInternalElements,
			initOptions.showID,
			initOptions.profile,
			initOptions.playlistID
		)

		this._vizmseManager.on('connectionChanged', (connected) => this.connectionChanged(connected))

		this._vizmseManager.on('info', (str) => this.emit('info', 'VizMSE: ' + str))
		this._vizmseManager.on('warning', (str) => this.emit('warning', 'VizMSE' + str))
		this._vizmseManager.on('error', (e) => this.emit('error', 'VizMSE', e))
		this._vizmseManager.on('debug', (...args) => this.emit('debug', ...args))

		await this._vizmseManager.initializeRundown()

		return true
	}

	/**
	 * Terminates the device safely such that things can be garbage collected.
	 */
	async terminate(): Promise<boolean> {
		if (this._vizmseManager) {
			await this._vizmseManager.terminate()
			delete this._vizmseManager
		}
		this._doOnTime.dispose()

		return true
	}
	/** Called by the Conductor a bit before a .handleState is called */
	prepareForHandleState(newStateTime: number) {
		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(newStateTime)
		this.cleanUpStates(0, newStateTime)
	}
	/**
	 * Generates an array of VizMSE commands by comparing the newState against the oldState, or the current device state.
	 */
	handleState(newState: TimelineState, newMappings: Mappings) {
		super.onHandleState(newState, newMappings)
		// check if initialized:
		if (!this._vizmseManager || !this._vizmseManager.initialized) {
			this.emit('warning', 'VizMSE.v-connection not initialized yet')
			return
		}

		const previousStateTime = Math.max(this.getCurrentTime(), newState.time)

		const oldVizMSEState: VizMSEState = (
			this.getStateBefore(previousStateTime) || { state: { time: 0, layer: {} } }
		).state

		const newVizMSEState = this.convertStateToVizMSE(newState, newMappings)

		const commandsToAchieveState = this._diffStates(oldVizMSEState, newVizMSEState, newState.time)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)

		// add the new commands to the queue
		this._addToQueue(commandsToAchieveState)

		// store the new state, for later use:
		this.setState(newVizMSEState, newState.time)
	}

	/**
	 * Clear any scheduled commands after this time
	 * @param clearAfterTime
	 */
	clearFuture(clearAfterTime: number) {
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}
	get canConnect(): boolean {
		return true
	}
	get connected(): boolean {
		return this._vizMSEConnected
	}

	get deviceType() {
		return DeviceType.VIZMSE
	}
	get deviceName(): string {
		return `VizMSE ${this._vizMSE ? this._vizMSE.hostname : 'Uninitialized'}`
	}

	get queue() {
		return this._doOnTime.getQueue()
	}

	get supportsExpectedPlayoutItems(): boolean {
		return true
	}
	public handleExpectedPlayoutItems(expectedPlayoutItems: Array<ExpectedPlayoutItemContent>): void {
		this.emit('debug', 'VIZDEBUG: handleExpectedPlayoutItems called')
		if (this._vizmseManager) {
			this.emit('debug', 'VIZDEBUG: manager exists')
			this._vizmseManager.setExpectedPlayoutItems(expectedPlayoutItems)
		}
	}

	public getCurrentState(): VizMSEState | undefined {
		return (this.getState() || { state: undefined }).state
	}
	public connectionChanged(connected?: boolean) {
		if (connected === true || connected === false) this._vizMSEConnected = connected
		this.emit('connectionChanged', this.getStatus())
	}
	/**
	 * Takes a timeline state and returns a VizMSE State that will work with the state lib.
	 * @param timelineState The timeline state to generate from.
	 */
	convertStateToVizMSE(timelineState: TimelineState, mappings: Mappings): VizMSEState {
		const state: VizMSEState = {
			time: timelineState.time,
			layer: {},
		}

		_.each(timelineState.layers, (layer: ResolvedTimelineObjectInstance, layerName: string) => {
			const layerExt = layer as ResolvedTimelineObjectInstanceExtended
			let foundMapping: Mapping = mappings[layerName]

			let isLookahead = false
			if (!foundMapping && layerExt.isLookahead && layerExt.lookaheadForLayer) {
				foundMapping = mappings[layerExt.lookaheadForLayer]
				isLookahead = true
			}
			if (foundMapping && foundMapping.device === DeviceType.VIZMSE && foundMapping.deviceId === this.deviceId) {
				if (layer.content) {
					const l = (layer as any) as TimelineObjVIZMSEAny

					if (l.content.type === TimelineContentTypeVizMSE.LOAD_ALL_ELEMENTS) {
						state.layer[layerName] = literal<VizMSEStateLayerLoadAllElements>({
							timelineObjId: l.id,
							contentType: TimelineContentTypeVizMSE.LOAD_ALL_ELEMENTS,
						})
					} else if (l.content.type === TimelineContentTypeVizMSE.CLEAR_ALL_ELEMENTS) {
						// Special case: clear all graphics:
						state.isClearAll = {
							timelineObjId: l.id,
							channelsToSendCommands: l.content.channelsToSendCommands,
						}
					} else if (l.content.type === TimelineContentTypeVizMSE.CONTINUE) {
						state.layer[layerName] = literal<VizMSEStateLayerContinue>({
							timelineObjId: l.id,
							contentType: TimelineContentTypeVizMSE.CONTINUE,
							direction: l.content.direction,
							reference: l.content.reference,
						})
					} else {
						const stateLayer = content2StateLayer(l.id, l.content as any)
						if (stateLayer) {
							if (isLookahead) stateLayer.lookahead = true

							state.layer[layerName] = stateLayer
						}
					}
				}
			}
		})

		if (state.isClearAll) {
			// clear rest of state:
			state.layer = {}
		}

		// Fix references:
		_.each(state.layer, (layer) => {
			if (layer.contentType === TimelineContentTypeVizMSE.CONTINUE) {
				const otherLayer = state.layer[layer.reference]
				if (otherLayer) {
					if (
						otherLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_INTERNAL ||
						otherLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_PILOT
					) {
						layer.referenceContent = otherLayer
					} else {
						// it's not possible to reference that kind of object
						this.emit(
							'warning',
							`object "${layer.timelineObjId}" of contentType="${layer.contentType}", cannot reference object "${otherLayer.timelineObjId}" on layer "${layer.reference}" of contentType="${otherLayer.contentType}" `
						)
					}
				}
			}
		})

		return state
	}

	/**
	 * Prepares the physical device for playout.
	 * @param okToDestroyStuff Whether it is OK to do things that affects playout visibly
	 */
	async makeReady(okToDestroyStuff?: boolean, activeRundownId?: string): Promise<void> {
		if (this._vizmseManager) {
			this._vizmseManager.activeRundownId =
				this._initOptions && this._initOptions.onlyPreloadActiveRundown ? activeRundownId : undefined
			await this._vizmseManager.activate()
		} else throw new Error(`Unable to activate vizMSE, not initialized yet!`)

		if (okToDestroyStuff) {
			// reset our own state(s):
			this.clearStates()

			if (this._vizmseManager) {
				if (this._initOptions && this._initOptions.clearAllOnMakeReady) {
					if (this._initOptions.clearAllTemplateName) {
						await this._vizmseManager.clearAll({
							type: VizMSECommandType.CLEAR_ALL_ELEMENTS,
							time: this.getCurrentTime(),
							timelineObjId: 'makeReady',
							templateName: this._initOptions.clearAllTemplateName,
						})
					}
					if (this._initOptions.clearAllCommands && this._initOptions.clearAllCommands.length) {
						await this._vizmseManager.clearEngines({
							type: VizMSECommandType.CLEAR_ALL_ENGINES,
							time: this.getCurrentTime(),
							timelineObjId: 'makeReady',
							channels: 'all',
							commands: this._initOptions.clearAllCommands,
						})
					}
				}
			} else throw new Error(`Unable to activate vizMSE, not initialized yet!`)
		}
	}
	/**
	 * The standDown event could be triggered at a time after broadcast
	 * @param okToDestroyStuff If true, the device may do things that might affect the visible output
	 */
	async standDown(okToDestroyStuff?: boolean): Promise<void> {
		if (okToDestroyStuff) {
			if (this._vizmseManager) {
				if (!this._initOptions || !this._initOptions.dontDeactivateOnStandDown) {
					await this._vizmseManager.deactivate()
				} else {
					this._vizmseManager.standDownActiveRundown() // because we still want to stop monitoring expectedPlayoutItems
				}
			}
		}
	}
	getStatus(): DeviceStatus {
		let statusCode = StatusCode.GOOD
		const messages: Array<string> = []

		if (!this._vizMSEConnected) {
			statusCode = StatusCode.BAD
			messages.push('Not connected')
		} else if (
			this._vizmseManager &&
			(this._vizmseManager.notLoadedCount > 0 || this._vizmseManager.loadingCount > 0)
		) {
			statusCode = StatusCode.WARNING_MINOR
			messages.push(
				`Got ${this._vizmseManager.notLoadedCount} elements not yet loaded to the Viz Engine (${this._vizmseManager.loadingCount} are currently loading)`
			)
		}

		return {
			statusCode: statusCode,
			messages: messages,
			active: this.isActive,
		}
	}
	/**
	 * Compares the new timeline-state with the old one, and generates commands to account for the difference
	 */
	private _diffStates(oldState: VizMSEState, newState: VizMSEState, time: number): Array<VizMSECommand> {
		const highPrioCommands: VizMSECommand[] = []
		const lowPrioCommands: VizMSECommand[] = []

		const addCommand = (command: VizMSECommand, lowPriority?: boolean) => {
			;(lowPriority ? lowPrioCommands : highPrioCommands).push(command)
		}

		/** The time of when to run "preparation" commands */
		let prepareTime = Math.min(
			time,
			Math.max(
				time - IDEAL_PREPARE_TIME,
				oldState.time + PREPARE_TIME_WAIT // earliset possible prepareTime
			)
		)
		if (prepareTime < this.getCurrentTime()) {
			// Only to not emit an unnessesary slowCommand event
			prepareTime = this.getCurrentTime()
		}
		if (time < prepareTime) {
			prepareTime = time - 10
		}

		_.each(newState.layer, (newLayer: VizMSEStateLayer, layerId: string) => {
			const oldLayer: VizMSEStateLayer | undefined = oldState.layer[layerId]

			if (newLayer.contentType === TimelineContentTypeVizMSE.LOAD_ALL_ELEMENTS) {
				if (!oldLayer || !_.isEqual(newLayer, oldLayer)) {
					addCommand(
						literal<VizMSECommandLoadAllElements>({
							timelineObjId: newLayer.timelineObjId,
							fromLookahead: newLayer.lookahead,
							layerId: layerId,

							type: VizMSECommandType.LOAD_ALL_ELEMENTS,
							time: time,
						}),
						newLayer.lookahead
					)
				}
			} else if (newLayer.contentType === TimelineContentTypeVizMSE.CONTINUE) {
				if ((!oldLayer || !_.isEqual(newLayer, oldLayer)) && newLayer.referenceContent) {
					const props = {
						timelineObjId: newLayer.timelineObjId,
						fromLookahead: newLayer.lookahead,
						layerId: layerId,

						templateInstance: VizMSEManager.getTemplateInstance(newLayer.referenceContent),
						templateName: VizMSEManager.getTemplateName(newLayer.referenceContent),
						templateData: VizMSEManager.getTemplateData(newLayer.referenceContent),
						channelName: newLayer.referenceContent.channelName,
					}
					if ((newLayer.direction || 1) === 1) {
						addCommand(
							literal<VizMSECommandContinue>({
								...props,
								type: VizMSECommandType.CONTINUE_ELEMENT,
								time: time,
							}),
							newLayer.lookahead
						)
					} else {
						addCommand(
							literal<VizMSECommandContinueReverse>({
								...props,
								type: VizMSECommandType.CONTINUE_ELEMENT_REVERSE,
								time: time,
							}),
							newLayer.lookahead
						)
					}
				}
			} else {
				const props = {
					timelineObjId: newLayer.timelineObjId,
					fromLookahead: newLayer.lookahead,
					layerId: layerId,

					templateInstance: VizMSEManager.getTemplateInstance(newLayer),
					templateName: VizMSEManager.getTemplateName(newLayer),
					templateData: VizMSEManager.getTemplateData(newLayer),
					channelName: newLayer.channelName,
				}
				if (
					!oldLayer ||
					!_.isEqual(
						_.omit(newLayer, ['continueStep', 'timelineObjId', 'outTransition']),
						_.omit(oldLayer, ['continueStep', 'timelineObjId', 'outTransition'])
					)
				) {
					if (
						newLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_INTERNAL ||
						newLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_PILOT
					) {
						// Maybe prepare the element first:
						addCommand(
							literal<VizMSECommandPrepare>({
								...props,
								type: VizMSECommandType.PREPARE_ELEMENT,
								time: prepareTime,
							}),
							newLayer.lookahead
						)

						if (newLayer.cue) {
							// Cue the element
							addCommand(
								literal<VizMSECommandCue>({
									...props,
									type: VizMSECommandType.CUE_ELEMENT,
									time: time,
								}),
								newLayer.lookahead
							)
						} else {
							// Start playing element
							addCommand(
								literal<VizMSECommandTake>({
									...props,
									type: VizMSECommandType.TAKE_ELEMENT,
									time: time,
								}),
								newLayer.lookahead
							)
						}
					}
				} else if (
					(oldLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_INTERNAL ||
						oldLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_PILOT) &&
					(newLayer.continueStep || 0) > (oldLayer.continueStep || 0)
				) {
					// An increase in continueStep should result in triggering a continue:
					addCommand(
						literal<VizMSECommandContinue>({
							...props,
							type: VizMSECommandType.CONTINUE_ELEMENT,
							time: time,
						}),
						newLayer.lookahead
					)
				} else if (
					(oldLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_INTERNAL ||
						oldLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_PILOT) &&
					(newLayer.continueStep || 0) < (oldLayer.continueStep || 0)
				) {
					// A decrease in continueStep should result in triggering a continue:
					addCommand(
						literal<VizMSECommandContinueReverse>({
							...props,
							type: VizMSECommandType.CONTINUE_ELEMENT_REVERSE,
							time: time,
						}),
						newLayer.lookahead
					)
				}
			}
		})

		_.each(oldState.layer, (oldLayer: VizMSEStateLayer, layerId: string) => {
			const newLayer = newState.layer[layerId]
			if (!newLayer) {
				if (
					oldLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_INTERNAL ||
					oldLayer.contentType === TimelineContentTypeVizMSE.ELEMENT_PILOT
				) {
					// Stopped playing
					addCommand(
						literal<VizMSECommandTakeOut>({
							type: VizMSECommandType.TAKEOUT_ELEMENT,
							time: time,
							timelineObjId: oldLayer.timelineObjId,
							fromLookahead: oldLayer.lookahead,
							layerId: layerId,
							transition: oldLayer && oldLayer.outTransition,

							templateInstance: VizMSEManager.getTemplateInstance(oldLayer),
							templateName: VizMSEManager.getTemplateName(oldLayer),
							templateData: VizMSEManager.getTemplateData(oldLayer),
							channelName: oldLayer.channelName,
						}),
						oldLayer.lookahead
					)
				}
			}
		})

		if (newState.isClearAll && !oldState.isClearAll) {
			// Special: clear all graphics

			const clearingCommands: VizMSECommand[] = []

			const templateName = this._initOptions && this._initOptions.clearAllTemplateName
			if (!templateName) {
				this.emit('warning', `vizMSE: initOptions.clearAllTemplateName is not set!`)
			} else {
				// Start playing special element:
				clearingCommands.push(
					literal<VizMSECommandClearAllElements>({
						timelineObjId: newState.isClearAll.timelineObjId,
						time: time,
						type: VizMSECommandType.CLEAR_ALL_ELEMENTS,
						templateName: templateName,
					})
				)
			}
			if (
				newState.isClearAll.channelsToSendCommands &&
				this._initOptions &&
				this._initOptions.clearAllCommands &&
				this._initOptions.clearAllCommands.length
			) {
				// Send special commands to the engines:
				clearingCommands.push(
					literal<VizMSECommandClearAllEngines>({
						timelineObjId: newState.isClearAll.timelineObjId,
						time: time,
						type: VizMSECommandType.CLEAR_ALL_ENGINES,
						channels: newState.isClearAll.channelsToSendCommands,
						commands: this._initOptions.clearAllCommands,
					})
				)
			}
			return clearingCommands
		}
		const sortCommands = (commands: VizMSECommand[]): VizMSECommand[] => {
			// Sort the commands so that take out:s are run first
			return commands.sort((a, b) => {
				if (a.type === VizMSECommandType.TAKEOUT_ELEMENT && b.type !== VizMSECommandType.TAKEOUT_ELEMENT)
					return -1
				if (a.type !== VizMSECommandType.TAKEOUT_ELEMENT && b.type === VizMSECommandType.TAKEOUT_ELEMENT)
					return 1
				return 0
			})
		}
		sortCommands(highPrioCommands)
		sortCommands(lowPrioCommands)

		const concatCommands = sortCommands(highPrioCommands.concat(lowPrioCommands))

		let highestDelay = 0
		concatCommands.forEach((command) => {
			if (command.type === VizMSECommandType.TAKEOUT_ELEMENT) {
				if (command.transition && command.transition.delay) {
					if (command.transition.delay > highestDelay) {
						highestDelay = command.transition.delay
					}
				}
			}
		})

		if (highestDelay > 0) {
			concatCommands.forEach((command, index) => {
				if (
					command.type === VizMSECommandType.TAKE_ELEMENT &&
					command.layerId &&
					newState.layer[command.layerId].contentType === TimelineContentTypeVizMSE.ELEMENT_INTERNAL
				) {
					;(concatCommands[index] as VizMSECommandTake).transition = {
						type: VIZMSETransitionType.DELAY,
						delay: highestDelay + 20,
					}
				}
			})
		}

		this.emit('debug', `VIZMSE: COMMANDS: ${JSON.stringify(sortCommands(concatCommands))}`)

		return sortCommands(concatCommands)
	}
	private _doCommand(command: VizMSECommand, context: string, timlineObjId: string): Promise<void> {
		const time = this.getCurrentTime()
		return this._commandReceiver(time, command, context, timlineObjId)
	}
	/**
	 * Add commands to queue, to be executed at the right time
	 */
	private _addToQueue(commandsToAchieveState: Array<VizMSECommand>) {
		_.each(commandsToAchieveState, (cmd: VizMSECommand) => {
			this._doOnTime.queue(
				cmd.time,
				cmd.layerId,
				(c: { cmd: VizMSECommand }) => {
					return this._doCommand(c.cmd, c.cmd.type + '_' + c.cmd.timelineObjId, c.cmd.timelineObjId)
				},
				{ cmd: cmd }
			)

			this._doOnTimeBurst.queue(
				cmd.time,
				undefined,
				(c: { cmd: VizMSECommand }) => {
					if (c.cmd.type === VizMSECommandType.TAKE_ELEMENT && !c.cmd.fromLookahead) {
						if (this._vizmseManager && c.cmd.layerId) {
							this._vizmseManager.clearAllWaitWithLayer(c.cmd.layerId)
						}
					}
					return Promise.resolve()
				},
				{ cmd: cmd }
			)
		})
	}
	/**
	 * Sends commands to the VizMSE server
	 * @param time deprecated
	 * @param cmd Command to execute
	 */
	private async _defaultCommandReceiver(
		_time: number,
		cmd: VizMSECommand,
		context: string,
		timelineObjId: string
	): Promise<any> {
		const cwc: CommandWithContext = {
			context: context,
			timelineObjId: timelineObjId,
			command: cmd,
		}
		this.emit('debug', cwc)

		try {
			if (this._vizmseManager) {
				if (cmd.type === VizMSECommandType.PREPARE_ELEMENT) {
					await this._vizmseManager.prepareElement(cmd)
				} else if (cmd.type === VizMSECommandType.CUE_ELEMENT) {
					await this._vizmseManager.cueElement(cmd)
				} else if (cmd.type === VizMSECommandType.TAKE_ELEMENT) {
					await this._vizmseManager.takeElement(cmd)
				} else if (cmd.type === VizMSECommandType.TAKEOUT_ELEMENT) {
					await this._vizmseManager.takeoutElement(cmd)
				} else if (cmd.type === VizMSECommandType.CONTINUE_ELEMENT) {
					await this._vizmseManager.continueElement(cmd)
				} else if (cmd.type === VizMSECommandType.CONTINUE_ELEMENT_REVERSE) {
					await this._vizmseManager.continueElementReverse(cmd)
				} else if (cmd.type === VizMSECommandType.LOAD_ALL_ELEMENTS) {
					await this._vizmseManager.loadAllElements(cmd)
				} else if (cmd.type === VizMSECommandType.CLEAR_ALL_ELEMENTS) {
					await this._vizmseManager.clearAll(cmd)
				} else if (cmd.type === VizMSECommandType.CLEAR_ALL_ENGINES) {
					await this._vizmseManager.clearEngines(cmd)
				} else {
					throw new Error(`Unsupported command type "${(cmd as VizMSECommand).type}"`)
				}
			} else {
				throw new Error(`Not initialized yet`)
			}
		} catch (error) {
			const errorString = error && error.message ? error.message : error.toString()
			this.emit('commandError', new Error(errorString), cwc)
		}
	}
	public ignoreWaitsInTests() {
		if (!this._vizmseManager) throw new Error('_vizmseManager not set')
		this._vizmseManager.ignoreAllWaits = true
	}
}
class VizMSEManager extends EventEmitter {
	public initialized = false
	public notLoadedCount = 0
	public loadingCount = 0
	public activeRundownId: string | undefined

	private _rundown: VRundown | undefined
	private _elementCache: { [hash: string]: CachedVElement } = {}
	private _expectedPlayoutItems: Array<ExpectedPlayoutItemContent> = []
	private _monitorAndLoadElementsInterval?: NodeJS.Timer
	private _monitorMSEConnection?: NodeJS.Timer
	private _lastTimeCommandSent = 0
	private _hasActiveRundown = false
	private _elementsLoaded: { [hash: string]: { element: VElement; isLoaded: boolean; isLoading: boolean } } = {}
	private _getRundownPromise?: Promise<VRundown>
	private _mseConnected = false
	private _msePingConnected = false
	private _waitWithLayers: {
		[portId: string]: Array<() => void>
	} = {}
	public ignoreAllWaits = false // Only to be used in tests
	private _cacheInternalElementsSentLoaded: { [hash: string]: true } = {}

	constructor(
		private _parentVizMSEDevice: VizMSEDevice,
		private _vizMSE: MSE,
		public preloadAllElements: boolean = false,
		public autoLoadInternalElements: boolean = false,
		private _showID: string,
		private _profile: string,
		private _playlistID?: string
	) {
		super()
	}
	/**
	 * Initialize the Rundown in MSE.
	 * Our approach is to create a single rundown on initialization, and then use only that for later control.
	 */
	public async initializeRundown(): Promise<void> {
		this._vizMSE.on('connected', () => this.mseConnectionChanged(true))
		this._vizMSE.on('disconnected', () => this.mseConnectionChanged(false))

		const initializeRundownInner = async () => {
			try {
				// Perform a ping, to ensure we are connected properly
				await this._vizMSE.ping()
				this._msePingConnected = true
				this.mseConnectionChanged(true)

				// Setup the rundown used by this device:
				const rundown = await this._getRundown()

				if (!rundown) throw new Error(`VizMSEManager: Unable to create rundown!`)
			} catch (e) {
				setTimeout(() => initializeRundownInner(), INIT_RETRY_INTERVAL)
				return
			}

			// const profile = await this._vizMSE.getProfile('sofie') // TODO: Figure out if this is needed

			if (this._monitorAndLoadElementsInterval) {
				clearInterval(this._monitorAndLoadElementsInterval)
			}
			this._monitorAndLoadElementsInterval = setInterval(() => {
				this._monitorLoadedElements().catch((...args) => {
					this.emit('error', ...args)
				})
			}, MONITOR_INTERVAL)

			if (this._monitorMSEConnection) {
				clearInterval(this._monitorMSEConnection)
			}
			this._monitorMSEConnection = setInterval(() => this._monitorConnection(), MONITOR_INTERVAL)

			this.initialized = true
		}

		await initializeRundownInner()
	}
	/**
	 * Close connections and die
	 */
	public async terminate() {
		if (this._monitorAndLoadElementsInterval) {
			clearInterval(this._monitorAndLoadElementsInterval)
		}
		if (this._monitorMSEConnection) {
			clearInterval(this._monitorMSEConnection)
		}
		if (this._vizMSE) {
			await this._vizMSE.close()
		}
	}
	/**
	 * Set the collection of expectedPlayoutItems.
	 * These will be monitored and can be triggered to pre-load.
	 */
	public setExpectedPlayoutItems(expectedPlayoutItems: Array<ExpectedPlayoutItemContent>) {
		this.emit('debug', 'VIZDEBUG: setExpectedPlayoutItems called')
		if (this.preloadAllElements) {
			this.emit('debug', 'VIZDEBUG: preload elements allowed')
			this._expectedPlayoutItems = expectedPlayoutItems

			this._getExpectedPlayoutItems() // Calling this in order to trigger creation of all elements
				.then(async () => {
					if (this._rundown && this._hasActiveRundown && this.autoLoadInternalElements) {
						this.emit('debug', 'VIZDEBUG: auto load internal elements...')
						await this.updateElementsLoadedStatus()

						// When a new element is added, we'll trigger a show init:
						let triggerShowInit = false
						_.each(this._elementsLoaded, async (e, hash: string) => {
							if (this._isInternalElement(e.element)) {
								if (!e.isLoaded) {
									if (!this._cacheInternalElementsSentLoaded[hash]) {
										triggerShowInit = true
										this.emit(
											'debug',
											`Element "${this._getElementReference(e.element)}" is not loaded`
										)
									}
									this._cacheInternalElementsSentLoaded[hash] = true
								}
							}
						})
						if (triggerShowInit) {
							this.emit('debug', `Triggering show init`)
							await this._rundown.activate(false, true, false) // Init show will trigger a load of the internal elements
						}
					}
				})
				.catch((error) => this.emit('error', error))
		}
	}
	/**
	 * Activate the rundown.
	 * This causes the MSE rundown to activate, which must be done before using it.
	 * Doing this will make MSE start loading things onto the vizEngine etc.
	 */
	public async activate(): Promise<void> {
		this._triggerCommandSent()
		const rundown = await this._getRundown()

		// clear any existing elements from the existing rundown
		try {
			await rundown.purge()
		} catch (error) {
			this.emit('error', error)
		}
		this._clearCache()

		this._triggerCommandSent()
		await this._triggerLoadAllElements(true)
		this._triggerCommandSent()
		this._hasActiveRundown = true
	}
	/**
	 * Deactivate the MSE rundown.
	 * This causes the MSE to stand down and clear the vizEngines of any loaded graphics.
	 */
	public async deactivate(): Promise<void> {
		const rundown = await this._getRundown()
		this._triggerCommandSent()
		await rundown.deactivate()
		this._triggerCommandSent()
		this.standDownActiveRundown()
	}
	public standDownActiveRundown(): void {
		this._hasActiveRundown = false
	}
	/**
	 * Prepare an element
	 * This creates the element and is intended to be called a little time ahead of Takeing the element.
	 */
	public async prepareElement(cmd: VizMSECommandPrepare): Promise<void> {
		const elementHash = this.getElementHash(cmd)
		this.emit('debug', `VizMSE: prepare "${elementHash}"`)
		this._triggerCommandSent()
		await this._checkPrepareElement(cmd, true)
		this._triggerCommandSent()
	}
	/**
	 * Cue:ing an element: Load and play the first frame of a graphic
	 */
	public async cueElement(cmd: VizMSECommandCue): Promise<void> {
		const rundown = await this._getRundown()

		const elementRef = await this._checkPrepareElement(cmd)

		await this._checkElementExists(cmd)
		await this._handleRetry(() => {
			this.emit('debug', `VizMSE: cue "${elementRef}"`)
			return rundown.cue(elementRef)
		})
	}
	/**
	 * Take an element: Load and Play a graphic element, run in-animatinos etc
	 */
	public async takeElement(cmd: VizMSECommandTake): Promise<void> {
		const rundown = await this._getRundown()

		const elementRef = await this._checkPrepareElement(cmd)

		if (cmd.transition) {
			if (cmd.transition.type === VIZMSETransitionType.DELAY) {
				if (await this.waitWithLayer(cmd.layerId || '__default', cmd.transition.delay)) {
					// at this point, the wait aws aborted by someone else. Do nothing then.
					return
				}
			}
		}

		await this._checkElementExists(cmd)
		await this._handleRetry(() => {
			this.emit('debug', `VizMSE: take "${elementRef}"`)

			return rundown.take(elementRef)
		})
	}
	/**
	 * Take out: Animate out a graphic element
	 */
	public async takeoutElement(cmd: VizMSECommandTakeOut): Promise<void> {
		const rundown = await this._getRundown()

		if (cmd.transition) {
			if (cmd.transition.type === VIZMSETransitionType.DELAY) {
				if (await this.waitWithLayer(cmd.layerId || '__default', cmd.transition.delay)) {
					// at this point, the wait aws aborted by someone else. Do nothing then.
					return
				}
			}
		}

		const elementRef = await this._checkPrepareElement(cmd)

		await this._checkElementExists(cmd)
		await this._handleRetry(() => {
			this.emit('debug', `VizMSE: out "${elementRef}"`)
			return rundown.out(elementRef)
		})
	}
	/**
	 * Continue: Cause the graphic element to step forward, if it has multiple states
	 */
	public async continueElement(cmd: VizMSECommandContinue): Promise<void> {
		const rundown = await this._getRundown()

		const elementRef = await this._checkPrepareElement(cmd)

		await this._checkElementExists(cmd)
		await this._handleRetry(() => {
			this.emit('debug', `VizMSE: continue "${elementRef}"`)
			return rundown.continue(elementRef)
		})
	}
	/**
	 * Continue-reverse: Cause the graphic element to step backwards, if it has multiple states
	 */
	public async continueElementReverse(cmd: VizMSECommandContinueReverse): Promise<void> {
		const rundown = await this._getRundown()

		const elementRef = await this._checkPrepareElement(cmd)

		await this._checkElementExists(cmd)
		await this._handleRetry(() => {
			this.emit('debug', `VizMSE: continue reverse "${elementRef}"`)
			return rundown.continueReverse(elementRef)
		})
	}
	/**
	 * Special: trigger a template which clears all templates on the output
	 */
	public async clearAll(cmd: VizMSECommandClearAllElements): Promise<void> {
		const rundown = await this._getRundown()

		const template: VizMSEStateLayerInternal = {
			timelineObjId: cmd.timelineObjId,
			contentType: TimelineContentTypeVizMSE.ELEMENT_INTERNAL,
			templateName: cmd.templateName,
			templateData: [],
		}
		// Start playing special element:
		const cmdTake: VizMSECommandTake = {
			time: cmd.time,
			type: VizMSECommandType.TAKE_ELEMENT,
			timelineObjId: template.timelineObjId,
			templateInstance: VizMSEManager.getTemplateInstance(template),
			templateName: VizMSEManager.getTemplateName(template),
		}

		const elementRef = await this._checkPrepareElement(cmdTake)

		await this._checkElementExists(cmdTake)
		await this._handleRetry(() => {
			this.emit('debug', `VizMSE: clearAll take "${elementRef}"`)
			return rundown.take(elementRef)
		})
	}
	/**
	 * Special: send commands to Viz Engines in order to clear them
	 */
	public async clearEngines(cmd: VizMSECommandClearAllEngines): Promise<void> {
		try {
			const profile = await this._vizMSE.getProfile(this._profile)
			const engines = await this._vizMSE.getEngines()
			const enginesToClear = this._prepareEnginesToClear(profile, engines, cmd.channels)
			enginesToClear.forEach((engine) => {
				const sender = new VizEngineTcpSender(engine.port, engine.host)
				sender.on('warning', (w) => this.emit('warning', `clearEngines: ${w}`))
				sender.on('error', (e) => this.emit('error', `clearEngines: ${e}`))
				sender.send(cmd.commands)
			})
		} catch (e) {
			this.emit('warning', `Sending Clear-all command failed ${e}`)
		}
	}
	private _prepareEnginesToClear(
		profile: VProfile,
		engines: VizEngine[],
		channels: string[] | 'all'
	): Array<{ host: string; port: number }> {
		const enginesToClear: Array<{ host: string; port: number }> = []
		const outputs = new Map<string, string>() // engine name : channel name
		_.each(profile.execution_groups, (group, groupName) => {
			_.each(group, (entry) => {
				if (typeof entry === 'object' && entry.viz) {
					if (typeof entry.viz === 'object' && entry.viz.value) {
						outputs.set(entry.viz.value as string, groupName)
					}
				}
			})
		})
		const outputEngines = engines.filter((engine) => {
			return outputs.has(engine.name)
		})
		outputEngines.forEach((engine) => {
			_.each(_.keys(engine.renderer), (fullHost) => {
				const channelName = outputs.get(engine.name)
				if (channels === 'all' || _.contains(channels, channelName)) {
					const match = fullHost.match(/([^:]+):?(\d*)?/)
					const port = match && match[2] ? parseInt(match[2], 10) : 6100
					const host = match && match[1] ? match[1] : fullHost
					enginesToClear.push({ host, port })
				}
			})
		})
		return enginesToClear
	}
	/**
	 * Load all elements: Trigger a loading of all pilot elements onto the vizEngine.
	 * This might cause the vizEngine to freeze during load, so do not to it while on air!
	 */
	public async loadAllElements(_cmd: VizMSECommandLoadAllElements): Promise<void> {
		this._triggerCommandSent()
		await this._triggerLoadAllElements()
		this._triggerCommandSent()
	}
	/** Convenience function for determining the template name/vcpid */
	static getTemplateName(layer: VizMSEStateLayer): string | number {
		if (layer.contentType === TimelineContentTypeVizMSE.ELEMENT_INTERNAL) return layer.templateName
		if (layer.contentType === TimelineContentTypeVizMSE.ELEMENT_PILOT) return layer.templateVcpId
		throw new Error(`Unknown layer.contentType "${layer['contentType']}"`)
	}
	/** Convenience function to get the data for an element */
	static getTemplateData(layer: VizMSEStateLayer): string[] {
		if (layer.contentType === TimelineContentTypeVizMSE.ELEMENT_INTERNAL) return layer.templateData
		return []
	}
	/** Convenience function to get the "instance-id" of an element. This is intended to be unique for each usage/instance of the elemenet */
	static getTemplateInstance(layer: VizMSEStateLayer): string {
		if (layer.contentType === TimelineContentTypeVizMSE.ELEMENT_INTERNAL) {
			return 'sofieInt_' + layer.templateName + '_' + getHash(layer.templateData.join(','))
		}
		if (layer.contentType === TimelineContentTypeVizMSE.ELEMENT_PILOT) return 'pilot_' + layer.templateVcpId

		throw new Error(`Unknown layer.contentType "${layer['contentType']}"`)
	}

	private getElementHash(cmd: VizMSEPlayoutItemContentInternal): string {
		if (_.isNumber(cmd.templateInstance)) {
			return 'pilot_' + cmd.templateInstance
		} else {
			return 'int_' + cmd.templateInstance
		}
	}
	private _getCachedElement(hash: string): CachedVElement | undefined {
		return this._elementCache[hash]
	}
	private _cacheElement(hash: string, element: VElement) {
		if (!hash) throw new Error('_cacheElement: hash not set')
		if (!element) throw new Error('_cacheElement: element not set (with hash ' + hash + ')')
		if (this._elementCache[hash]) {
			this.emit('warning', `There is already an element with hash "${hash}" in cache`)
		}
		this._elementCache[hash] = { hash, element }
	}
	private _clearCache() {
		_.each(_.keys(this._elementCache), (hash) => {
			delete this._elementCache[hash]
		})
		this._cacheInternalElementsSentLoaded = {}
	}
	private _getElementReference(el: InternalElement): string
	private _getElementReference(el: ExternalElement): number
	private _getElementReference(el: VElement): string | number
	private _getElementReference(el: VElement): string | number {
		if (this._isInternalElement(el)) return el.name
		if (this._isExternalElement(el)) return Number(el.vcpid) // TMP!!

		throw Error('Unknown element type, neither internal nor external')
	}
	private _isInternalElement(element: VElement): element is InternalElement {
		const el = element as any
		return el && el.name && !el.vcpid
	}
	private _isExternalElement(element: VElement): element is ExternalElement {
		const el = element as any
		return el && el.vcpid
	}
	/**
	 * Check if element is already created, otherwise create it and return it.
	 */
	private async _checkPrepareElement(
		cmd: VizMSEPlayoutItemContentInternal,
		fromPrepare?: boolean
	): Promise<string | number> {
		// check if element is prepared
		const elementHash = this.getElementHash(cmd)

		let element = (this._getCachedElement(elementHash) || { element: undefined }).element
		if (!element) {
			if (!fromPrepare) {
				this.emit('warning', `Late preparation of element "${elementHash}"`)
			} else {
				this.emit('debug', `VizMSE: preparing new "${elementHash}"`)
			}
			element = await this._prepareNewElement(cmd)

			if (!fromPrepare) await this._wait(100) // wait a bit, because taking isn't possible right away anyway at this point
		}
		return this._getElementReference(element)
		// })
	}
	/** Check that the element exists and if not, throw error */
	private async _checkElementExists(cmd: VizMSEPlayoutItemContentInternal): Promise<void> {
		const rundown = await this._getRundown()

		const elementHash = this.getElementHash(cmd)
		const cachedElement = this._getCachedElement(elementHash)
		if (!cachedElement) throw new Error(`_checkElementExists: cachedElement falsy`)
		const elementRef = this._getElementReference(cachedElement.element)
		const elementIsExternal = cachedElement && this._isExternalElement(cachedElement.element)

		if (elementIsExternal) {
			const element = await rundown.getElement(elementRef)
			if (this._isExternalElement(element) && element.exists === 'no') {
				throw new Error(`Can't take the element "${elementRef}" while it has the property exists="no"`)
			}
		}
	}
	/**
	 * Create a new element in MSE
	 */
	private async _prepareNewElement(cmd: VizMSEPlayoutItemContentInternal): Promise<VElement> {
		const rundown = await this._getRundown()
		const elementHash = this.getElementHash(cmd)

		try {
			if (_.isNumber(cmd.templateName)) {
				// Prepare a pilot element
				const pilotEl = await rundown.createElement(cmd.templateName, cmd.channelName)

				this._cacheElement(elementHash, pilotEl)
				return pilotEl
			} else {
				// Prepare an internal element
				const internalEl = await rundown.createElement(
					cmd.templateName,
					cmd.templateInstance,
					cmd.templateData || [],
					cmd.channelName
				)

				this._cacheElement(elementHash, internalEl)
				return internalEl
			}
		} catch (e) {
			if (e.toString().match(/already exist/i)) {
				// "An internal graphics element with name 'xxxxxxxxxxxxxxx' already exists."
				// If the object already exists, it's not an error, fetch and use the element instead

				const element = await rundown.getElement(cmd.templateInstance)

				this._cacheElement(elementHash, element)
				return element
			} else {
				throw e
			}
		}
	}
	private async _getExpectedPlayoutItems(): Promise<{ [hash: string]: VizMSEPlayoutItemContentInternal }> {
		this.emit('debug', `VISMSE: _getExpectedPlayoutItems (${this._expectedPlayoutItems.length})`)

		const hashesAndItems: { [hash: string]: VizMSEPlayoutItemContentInternal } = {}

		const expectedPlayoutItems = _.filter(this._expectedPlayoutItems, (expectedPlayoutItem) => {
			const templateName = typeof expectedPlayoutItem.templateName as string | number | undefined
			return (
				(!this.activeRundownId || this.activeRundownId === expectedPlayoutItem.rundownId) &&
				typeof templateName !== 'undefined'
			)
		})

		await Promise.all(
			_.map(expectedPlayoutItems, async (expectedPlayoutItem) => {
				try {
					const stateLayer: VizMSEStateLayer | undefined = _.isNumber(expectedPlayoutItem.templateName)
						? content2StateLayer('', {
								deviceType: DeviceType.VIZMSE,
								type: TimelineContentTypeVizMSE.ELEMENT_PILOT,
								templateVcpId: expectedPlayoutItem.templateName,
						  } as TimelineObjVIZMSEElementPilot['content'])
						: content2StateLayer('', {
								deviceType: DeviceType.VIZMSE,
								type: TimelineContentTypeVizMSE.ELEMENT_INTERNAL,
								templateName: expectedPlayoutItem.templateName,
								templateData: expectedPlayoutItem.templateData,
						  } as TimelineObjVIZMSEElementInternal['content'])

					if (stateLayer) {
						const item: VizMSEPlayoutItemContentInternal = {
							...expectedPlayoutItem,
							templateInstance: VizMSEManager.getTemplateInstance(stateLayer),
						}
						await this._checkPrepareElement(item, true)
						hashesAndItems[this.getElementHash(item)] = item
					}
				} catch (e) {
					this.emit('error', `Error in _getExpectedPlayoutItems: ${e.toString()}`)
				}
			})
		)
		return hashesAndItems
	}

	/**
	 * Update the load-statuses of the expectedPlayoutItems -elements from MSE, where needed
	 */
	private async updateElementsLoadedStatus(forceReloadAll?: boolean) {
		const hashesAndItems = await this._getExpectedPlayoutItems()
		const elementsToLoad = _.compact(
			_.map(hashesAndItems, (item, hash) => {
				const el = this._getCachedElement(hash)
				if (!item.noAutoPreloading && el) {
					return {
						...el,
						item: item,
						hash: hash,
					}
				}
				return undefined
			})
		)
		if (this._rundown) {
			this.emit(
				'debug',
				`Updating status of elements starting, activeRundownId="${
					this.activeRundownId
				}", elementsToLoad.length=${elementsToLoad.length} (${_.keys(hashesAndItems).length})`
			)

			const rundown = await this._getRundown()

			if (forceReloadAll) {
				this._elementsLoaded = {}
			}
			await Promise.all(
				_.map(elementsToLoad, async (e) => {
					const cachedEl = this._elementsLoaded[e.hash]

					if (!cachedEl || !cachedEl.isLoaded) {
						try {
							const elementRef = await this._checkPrepareElement(e.item)

							this.emit('debug', `Updating status of element ${elementRef}`)

							// Update cached status of the element:
							const newEl = await rundown.getElement(elementRef)

							this._elementsLoaded[e.hash] = {
								element: newEl,
								isLoaded: this._isElementLoaded(newEl),
								isLoading: this._isElementLoading(newEl),
							}
							this.emit('debug', `Element ${elementRef}: ${JSON.stringify(newEl)}`)
						} catch (e) {
							this.emit('error', `Error in updateElementsLoadedStatus: ${e.toString()}`)
						}
					}
				})
			)

			this.emit(
				'debug',
				`Updating status of elements done, this._elementsLoaded.length=${_.keys(this._elementsLoaded).length}`
			)
		} else {
			throw Error('VizMSE.v-connection not initialized yet')
		}
	}
	/**
	 * Trigger a load of all elements that are not yet loaded onto the vizEngine.
	 */
	private async _triggerLoadAllElements(loadTwice = false): Promise<void> {
		const rundown = await this._getRundown()

		this.emit('debug', '_triggerLoadAllElements starting')
		// First, update the loading-status of all elements:
		await this.updateElementsLoadedStatus(true)

		// if (this._initializeRundownOnLoadAll) {

		// Then, load all elements that needs loading:
		const loadAllElementsThatNeedsLoading = async () => {
			this._triggerCommandSent()
			try {
				this.emit('debug', 'rundown.activate triggered')
				await rundown.activate() // Our theory: an extra initialization of the rundown playlist loads all internal elements
			} catch (error) {
				this.emit('warning', `Ignored error for rundown.activate(): ${error}`)
			}
			this._triggerCommandSent()
			await this._wait(1000)
			this._triggerCommandSent()
			await Promise.all(
				_.map(this._elementsLoaded, async (e) => {
					if (this._isInternalElement(e.element)) {
						// Not loading individual internal elements, since a show.initialization loads them good enough
					} else if (this._isExternalElement(e.element)) {
						if (e.isLoaded) {
							// The element is loaded fine, no need to do anything
							this.emit('debug', `Element "${this._getElementReference(e.element)}" is loaded`)
						} else if (e.isLoading) {
							// The element is currently loading, do nothing
							this.emit('debug', `Element "${this._getElementReference(e.element)}" is loading`)
						} else {
							// The element has not started loading, load it:
							this.emit(
								'debug',
								`Element "${this._getElementReference(e.element)}" is not loaded, initializing`
							)
							await rundown.initialize(this._getElementReference(e.element))
						}
					} else {
						this.emit('error', `Element "${this._getElementReference(e.element)}" type `)
					}
				})
			)
		}

		// He's making a list:
		await loadAllElementsThatNeedsLoading()
		await this._wait(2000)
		if (loadTwice) {
			// He's checking it twice:
			await this.updateElementsLoadedStatus()
			// Gonna find out what's loaded and nice:
			await loadAllElementsThatNeedsLoading()
		}

		this.emit('debug', '_triggerLoadAllElements done')
	}
	private _monitorConnection(): void {
		// (the ping will throuw on a timeout if ping doesn't return in time)
		if (this.initialized) {
			this._vizMSE.ping().then(
				() => {
					// ok!
					if (!this._msePingConnected) {
						this._msePingConnected = true
						this.onConnectionChanged()
					}
				},
				() => {
					// not ok!
					if (this._msePingConnected) {
						this._msePingConnected = false
						this.onConnectionChanged()
					}
				}
			)
		}
	}
	/** Monitor loading status of expected elements */
	private async _monitorLoadedElements(): Promise<void> {
		try {
			if (
				this._rundown &&
				this._hasActiveRundown &&
				this.preloadAllElements &&
				this._timeSinceLastCommandSent() > SAFE_PRELOAD_TIME
			) {
				await this.updateElementsLoadedStatus(false)

				let notLoaded = 0
				let loading = 0
				let loaded = 0

				_.each(this._elementsLoaded, (e) => {
					if (e.isLoaded) loaded++
					else if (e.isLoading) loading++
					else notLoaded++
				})

				if (notLoaded > 0 || loading > 0) {
					// emit debug data
					this.emit('debug', `Items on queue: notLoaded: ${notLoaded} loading: ${loading}, loaded: ${loaded}`)

					this.emit(
						'debug',
						`_elementsLoaded: ${_.map(
							_.filter(this._elementsLoaded, (e) => !e.isLoaded).slice(0, 10),
							(e) => {
								return JSON.stringify(e.element)
							}
						)}`
					)
				}

				this._setLoadedStatus(notLoaded, loading)
			} else this._setLoadedStatus(0, 0)
		} catch (e) {
			this.emit('error', e)
		}
	}
	private _wait(time: number): Promise<void> {
		if (this.ignoreAllWaits) return Promise.resolve()
		return new Promise((resolve) => setTimeout(resolve, time))
	}
	/** Execute fcn an retry a couple of times until it succeeds */
	private async _handleRetry<T>(fcn: () => Promise<T>): Promise<T | undefined> {
		let i = 0
		const maxNumberOfTries = 5

		const always = true
		while (always) {
			try {
				this._triggerCommandSent()
				const result = fcn()
				this._triggerCommandSent()
				return result
			} catch (e) {
				if (i++ < maxNumberOfTries) {
					if (e && e.toString && e.toString().match(/inexistent/i)) {
						// "PepTalk inexistent error"
						this.emit('debug', `VizMSE: _handleRetry got "inexistent" error, trying again...`)

						// Wait and try again:
						await this._wait(300)
					} else {
						// Unhandled error, give up:
						throw e
					}
				} else {
					// Give up, we've tried enough times already
					throw e
				}
			}
		}
		return
	}
	private _triggerCommandSent(): void {
		this._lastTimeCommandSent = Date.now()
	}
	private _timeSinceLastCommandSent(): number {
		return Date.now() - this._lastTimeCommandSent
	}
	private _setLoadedStatus(notLoaded: number, loading: number) {
		if (notLoaded !== this.notLoadedCount || loading !== this.loadingCount) {
			this.notLoadedCount = notLoaded
			this.loadingCount = loading
			this._parentVizMSEDevice.connectionChanged()
		}
	}
	/**
	 * Returns true if the element is successfully loaded (as opposed to "not-loaded" or "loading")
	 */
	private _isElementLoaded(el: VElement): boolean {
		if (this._isInternalElement(el)) {
			return (
				(el.available === '1.00' || el.available === '1' || el.available === undefined) &&
				(el.loaded === '1.00' || el.loaded === '1') &&
				el.is_loading !== 'yes'
			)
		} else if (this._isExternalElement(el)) {
			return (
				(el.available === '1.00' || el.available === '1') &&
				(el.loaded === '1.00' || el.loaded === '1') &&
				el.is_loading !== 'yes'
			)
		} else {
			throw new Error(`vizMSE: _isLoaded: unknown element type: ${el && JSON.stringify(el)}`)
		}
	}
	/**
	 * Returns true if the element has NOT started loading (is currently not loading, or finished loaded)
	 */
	private _isElementLoading(el: VElement) {
		if (this._isInternalElement(el)) {
			return el.loaded !== '1.00' && el.loaded !== '1' && el.is_loading === 'yes'
		} else if (this._isExternalElement(el)) {
			return el.loaded !== '1.00' && el.loaded !== '1' && el.is_loading === 'yes'
		} else {
			throw new Error(`vizMSE: _isLoaded: unknown element type: ${el && JSON.stringify(el)}`)
		}
	}
	/**
	 * Return the current MSE rundown, create it if it doesn't exists
	 */
	private async _getRundown(): Promise<VRundown> {
		if (!this._rundown) {
			// Only allow for one rundown fetch at the same time:
			if (this._getRundownPromise) {
				return this._getRundownPromise
			}

			const getRundownPromise = (async () => {
				// Check if the rundown already exists:
				// let rundown: VRundown | undefined = _.find(await this._vizMSE.getRundowns(), (rundown) => {
				// 	return (
				// 		rundown.show === this._showID &&
				// 		rundown.profile === this._profile &&
				// 		rundown.playlist === this._playlistID
				// 	)
				// })

				this.emit('debug', `Creating new rundown ${[this._showID, this._profile, this._playlistID]}`)

				const rundown = await this._vizMSE.createRundown(this._showID, this._profile, this._playlistID)

				this._rundown = rundown
				if (!this._rundown) throw new Error(`_getRundown: this._rundown is not set!`)
				return this._rundown
			})()

			this._getRundownPromise = getRundownPromise

			const rundown = await this._getRundownPromise

			this._rundown = rundown
			return rundown
		} else {
			return this._rundown
		}
	}
	private mseConnectionChanged(connected: boolean) {
		if (connected !== this._mseConnected) {
			this._mseConnected = connected
			this.onConnectionChanged()
		}
	}
	private onConnectionChanged() {
		this.emit('connectionChanged', this._mseConnected && this._msePingConnected)
	}

	public clearAllWaitWithLayer(portId: string) {
		if (!this._waitWithLayers[portId]) {
			_.each(this._waitWithLayers[portId], (fcn: (result: boolean) => void) => {
				fcn(true)
			})
		}
	}
	/**
	 * Returns true if the wait was cleared from someone else
	 */
	private waitWithLayer(layerId: string, delay: number): Promise<boolean> {
		return new Promise((resolve) => {
			if (!this._waitWithLayers[layerId]) this._waitWithLayers[layerId] = []
			this._waitWithLayers[layerId].push(resolve)
			setTimeout(() => {
				resolve(false)
			}, delay || 0)
		})
	}
}

interface VizMSEState {
	time: number
	layer: {
		[layerId: string]: VizMSEStateLayer
	}
	/** Special: If this is set, all other state will be disregarded and all graphics will be cleared */
	isClearAll?: {
		timelineObjId: string
		channelsToSendCommands?: string[]
	}
}
type VizMSEStateLayer =
	| VizMSEStateLayerInternal
	| VizMSEStateLayerPilot
	| VizMSEStateLayerContinue
	| VizMSEStateLayerLoadAllElements
interface VizMSEStateLayerBase {
	timelineObjId: string
	lookahead?: boolean
}
interface VizMSEStateLayerElementBase extends VizMSEStateLayerBase {
	contentType: TimelineContentTypeVizMSE
	continueStep?: number
	cue?: boolean

	outTransition?: VIZMSEOutTransition
}
interface VizMSEStateLayerInternal extends VizMSEStateLayerElementBase {
	contentType: TimelineContentTypeVizMSE.ELEMENT_INTERNAL

	templateName: string
	templateData: Array<string>
	channelName?: string
}
interface VizMSEStateLayerPilot extends VizMSEStateLayerElementBase {
	contentType: TimelineContentTypeVizMSE.ELEMENT_PILOT

	templateVcpId: number
	channelName?: string
}
interface VizMSEStateLayerContinue extends VizMSEStateLayerBase {
	contentType: TimelineContentTypeVizMSE.CONTINUE

	direction?: 1 | -1

	reference: string
	referenceContent?: VizMSEStateLayerInternal | VizMSEStateLayerPilot
}
interface VizMSEStateLayerLoadAllElements extends VizMSEStateLayerBase {
	contentType: TimelineContentTypeVizMSE.LOAD_ALL_ELEMENTS
}

interface VizMSECommandBase {
	time: number
	type: VizMSECommandType
	timelineObjId: string
	fromLookahead?: boolean
	layerId?: string
}
export enum VizMSECommandType {
	PREPARE_ELEMENT = 'prepare',
	CUE_ELEMENT = 'cue',
	TAKE_ELEMENT = 'take',
	TAKEOUT_ELEMENT = 'out',
	CONTINUE_ELEMENT = 'continue',
	CONTINUE_ELEMENT_REVERSE = 'continuereverse',
	LOAD_ALL_ELEMENTS = 'load_all_elements',
	CLEAR_ALL_ELEMENTS = 'clear_all_elements',
	CLEAR_ALL_ENGINES = 'clear_all_engines',
}

interface VizMSECommandElementBase extends VizMSECommandBase, VizMSEPlayoutItemContentInternal {}
interface VizMSECommandPrepare extends VizMSECommandElementBase {
	type: VizMSECommandType.PREPARE_ELEMENT
}
interface VizMSECommandCue extends VizMSECommandElementBase {
	type: VizMSECommandType.CUE_ELEMENT
}
interface VizMSECommandTake extends VizMSECommandElementBase {
	type: VizMSECommandType.TAKE_ELEMENT
	transition?: VIZMSEOutTransition
}
interface VizMSECommandTakeOut extends VizMSECommandElementBase {
	type: VizMSECommandType.TAKEOUT_ELEMENT
	transition?: VIZMSEOutTransition
}
interface VizMSECommandContinue extends VizMSECommandElementBase {
	type: VizMSECommandType.CONTINUE_ELEMENT
}
interface VizMSECommandContinueReverse extends VizMSECommandElementBase {
	type: VizMSECommandType.CONTINUE_ELEMENT_REVERSE
}
interface VizMSECommandLoadAllElements extends VizMSECommandBase {
	type: VizMSECommandType.LOAD_ALL_ELEMENTS
}
interface VizMSECommandClearAllElements extends VizMSECommandBase {
	type: VizMSECommandType.CLEAR_ALL_ELEMENTS

	templateName: string
}
interface VizMSECommandClearAllEngines extends VizMSECommandBase {
	type: VizMSECommandType.CLEAR_ALL_ENGINES

	channels: string[] | 'all'
	commands: string[]
}

type VizMSECommand =
	| VizMSECommandPrepare
	| VizMSECommandCue
	| VizMSECommandTake
	| VizMSECommandTakeOut
	| VizMSECommandContinue
	| VizMSECommandContinueReverse
	| VizMSECommandLoadAllElements
	| VizMSECommandClearAllElements
	| VizMSECommandClearAllEngines

interface VizMSEPlayoutItemContentInternal extends VIZMSEPlayoutItemContent {
	/** Name of the instance of the element in MSE, generated by us */
	templateInstance: string
}

interface CachedVElement {
	readonly hash: string
	readonly element: VElement
	hasBeenCued?: boolean
}

function content2StateLayer(
	timelineObjId: string,
	content: TimelineObjVIZMSEElementInternal['content'] | TimelineObjVIZMSEElementPilot['content']
): VizMSEStateLayer | undefined {
	if (content.type === TimelineContentTypeVizMSE.ELEMENT_INTERNAL) {
		const o: VizMSEStateLayerInternal = {
			timelineObjId: timelineObjId,
			contentType: TimelineContentTypeVizMSE.ELEMENT_INTERNAL,
			continueStep: content.continueStep,
			cue: content.cue,
			outTransition: content.outTransition,

			templateName: content.templateName,
			templateData: content.templateData,
			channelName: content.channelName,
		}
		return o
	} else if (content.type === TimelineContentTypeVizMSE.ELEMENT_PILOT) {
		const o: VizMSEStateLayerPilot = {
			timelineObjId: timelineObjId,
			contentType: TimelineContentTypeVizMSE.ELEMENT_PILOT,
			continueStep: content.continueStep,
			cue: content.cue,
			outTransition: content.outTransition,

			templateVcpId: content.templateVcpId,
			channelName: content.channelName,
		}
		return o
	}
	return
}

class VizEngineTcpSender extends EventEmitter {
	private _socket: net.Socket = new net.Socket()
	private _port: number
	private _host: string
	private _connected = false
	private _commandCount = 0
	private _sendQueue: string[] = []
	private _waitQueue: Set<number> = new Set()
	private _incomingData = ''
	private _responseTimeoutMs = 6000

	constructor(port: number, host: string) {
		super()
		this._port = port
		this._host = host
	}

	send(commands: string[]) {
		commands.forEach((command) => {
			this._sendQueue.push(command)
		})
		if (this._connected) {
			this._flushQueue()
		} else {
			this._connect()
		}
	}

	private _connect() {
		this._socket = net.createConnection(this._port, this._host)
		this._socket.on('connect', () => {
			this._connected = true
			if (this._sendQueue.length) {
				this._flushQueue()
			}
		})
		this._socket.on('error', (e) => {
			this.emit('error', e)
			this._destroy()
		})
		this._socket.on('lookup', () => {
			// this handles a dns exception, but the error is handled on 'error' event
		})
		this._socket.on('data', this._processData.bind(this))
	}

	private _flushQueue() {
		this._sendQueue.forEach((command) => {
			this._socket.write(`${++this._commandCount} ${command}\x00`)
			this._waitQueue.add(this._commandCount)
		})
		setTimeout(() => {
			if (this._waitQueue.size) {
				this.emit('warning', `Response from ${this._host}:${this._port} not received on time`)
				this._destroy()
			}
		}, this._responseTimeoutMs)
	}

	private _processData(data: Buffer) {
		this._incomingData = this._incomingData.concat(data.toString())
		const split = this._incomingData.split('\x00')
		if (split.length === 0 || (split.length === 1 && split[0] === '')) return
		if (split[split.length - 1] !== '') {
			this._incomingData = split.pop()!
		} else {
			this._incomingData = ''
		}
		split.forEach((message) => {
			const firstSpace = message.indexOf(' ')
			const id = message.substr(0, firstSpace)
			const contents = message.substr(firstSpace + 1)
			if (contents.startsWith('ERROR')) {
				this.emit('warning', contents)
			}
			this._waitQueue.delete(parseInt(id, 10))
		})
		if (this._waitQueue.size === 0) {
			this._destroy()
		}
	}

	private _destroy() {
		this._socket.destroy()
		this.removeAllListeners()
	}
}
