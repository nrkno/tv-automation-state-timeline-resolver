import * as _ from 'underscore'
import {
	DeviceWithState,
	CommandWithContext,
	DeviceStatus,
	StatusCode,
	IDevice
} from './device'
import {
	DeviceType,
	ShotokuCommandContent,
	ShotokuOptions,
	DeviceOptionsShotoku,
	ShotokuTransitionType,
	Mappings
} from '../types/src'
import { DoOnTime, SendMode } from '../doOnTime'

import {
	TimelineState
} from 'superfly-timeline'
import { ShotokuAPI, ShotokuCommand, ShotokuCommandType } from './shotokuAPI'

export interface DeviceOptionsShotokuInternal extends DeviceOptionsShotoku {
	options: (
		DeviceOptionsShotoku['options'] &
		{
			commandReceiver?: CommandReceiver
		}
	)
}
export type CommandReceiver = (time: number, cmd: ShotokuCommand, context: CommandContext, timelineObjId: string) => Promise<any>
interface Command {
	command: ShotokuCommand
	context: CommandContext
	timelineObjId: string
}
type CommandContext = string
type ShotokuDeviceState = { [index: string]: ShotokuCommandContent & { fromTlObject: string }}
interface ShotokuDeviceStateContent extends ShotokuCommandContent {
	fromTlObject: string
}
/**
 * This is a generic wrapper for any osc-enabled device.
 */
export class ShotokuDevice extends DeviceWithState<TimelineState> implements IDevice {

	private _doOnTime: DoOnTime
	private _shotoku: ShotokuAPI

	private _commandReceiver: CommandReceiver

	constructor (deviceId: string, deviceOptions: DeviceOptionsShotokuInternal, options) {
		super(deviceId, deviceOptions, options)
		if (deviceOptions.options) {
			if (deviceOptions.options.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
			else this._commandReceiver = this._defaultCommandReceiver
		}
		this._doOnTime = new DoOnTime(() => {
			return this.getCurrentTime()
		}, SendMode.BURST, this._deviceOptions)
		this._shotoku = new ShotokuAPI()
		this._shotoku.on('error', (info, e) => this.emit('error', e, info))
		this._shotoku.on('debug', (...args) => this.emit('debug', 'shotokuAPI', ...args))
		this.handleDoOnTime(this._doOnTime, 'OSC')
	}
	async init (initOptions: ShotokuOptions): Promise<boolean> {
		try {
			await this._shotoku.connect(initOptions.host, initOptions.port)
		} catch (e) {
			return false
		}

		return true
	}
	/** Called by the Conductor a bit before a .handleState is called */
	prepareForHandleState (newStateTime: number) {
		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(newStateTime)
		this.cleanUpStates(0, newStateTime)
	}
	/**
	 * Handles a new state such that the device will be in that state at a specific point
	 * in time.
	 * @param newState
	 */
	handleState (newState: TimelineState, newMappings: Mappings) {
		super.onHandleState(newState, newMappings)
		// Transform timeline states into device states
		let previousStateTime = Math.max(this.getCurrentTime(), newState.time)
		let oldState: TimelineState = (this.getStateBefore(previousStateTime) || { state: { time: 0, layers: {}, nextEvents: [] } }).state

		let oldAbstractState = this.convertStateToShotokuShots(oldState)
		let newAbstractState = this.convertStateToShotokuShots(newState)

		// Generate commands necessary to transition to the new state
		let commandsToAchieveState = this._diffStates(oldAbstractState, newAbstractState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)
		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newState, newState.time)
	}
	/**
	 * Clear any scheduled commands after this time
	 * @param clearAfterTime
	 */
	clearFuture (clearAfterTime: number) {
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}
	terminate () {
		this._doOnTime.dispose()
		return Promise.resolve(true)
	}
	getStatus (): DeviceStatus {
		return {
			statusCode: this._shotoku.connected ? StatusCode.GOOD : StatusCode.BAD,
			active: this.isActive
		}
	}
	makeReady (_okToDestroyStuff?: boolean): Promise<void> {
		return Promise.resolve() // TODO - enforce current state?
	}

	get canConnect (): boolean {
		return true // TODO?
	}
	get connected (): boolean {
		return this._shotoku.connected
	}
	/**
	 * Transform the timeline state into a device state, which is in this case also
	 * a timeline state.
	 * @param state
	 */
	convertStateToShotokuShots (state: TimelineState) {
		const shots: ShotokuDeviceState = {}

		_.each(state.layers, (layer) => {
			const content = layer.content as ShotokuCommandContent
			const show = content.show || 1

			if (!content.shot) return

			shots[show + '.' + content.shot] = {
				...content,
				fromTlObject: layer.id
			}
		})

		return shots
	}
	get deviceType () {
		return DeviceType.SHOTOKU
	}
	get deviceName (): string {
		return 'Shotoku ' + this.deviceId
	}
	get queue () {
		return this._doOnTime.getQueue()
	}
	/**
	 * Add commands to queue, to be executed at the right time
	 */
	private _addToQueue (commandsToAchieveState: Array<Command>, time: number) {
		_.each(commandsToAchieveState, (cmd: Command) => {
			this._doOnTime.queue(time, undefined, (cmd: Command) => {
				return this._commandReceiver(time, cmd.command, cmd.context, cmd.timelineObjId)
			}, cmd)
		})
	}
	/**
	 * Compares the new timeline-state with the old one, and generates commands to account for the difference
	 * @param oldShots The assumed current state
	 * @param newShots The desired state of the device
	 */
	private _diffStates (oldShots: ShotokuDeviceState, newShots: ShotokuDeviceState): Array<Command> {
		// unfortunately we don't know what shots belong to what camera, so we can't do anything smart

		let commands: Array<Command> = []

		_.each(newShots, (newCommandContent: ShotokuDeviceStateContent, index: string) => {
			let oldLayer = oldShots[index]
			if (!oldLayer) {
				// added!
				const shotokuCommand: ShotokuCommand = {
					show: newCommandContent.show,
					shot: newCommandContent.shot,
					type: newCommandContent.transitionType === ShotokuTransitionType.Fade ? ShotokuCommandType.Fade : ShotokuCommandType.Cut,
					changeOperatorScreen: newCommandContent.changeOperatorScreen
				}
				commands.push({
					context:		`added: ${newCommandContent.fromTlObject}`,
					timelineObjId:	newCommandContent.fromTlObject,
					command: 		shotokuCommand
				})
			} else {
				// since there is nothing but a trigger, we know nothing changed.
			}
		})
		// removed - there is nothing to do here as we don't know what to replace it with
		// _.each(oldShots, (oldCommandContent: ShotokuDeviceStateContent, address) => {
		// 	let newLayer = newShots[address]
		// 	if (!newLayer) {
				// removed!
				// commands.push({
				// 	commandName:	'removed',
				// 	context:		`removed: ${oldCommandContent.fromTlObject}`,
				// 	timelineObjId:	oldCommandContent.fromTlObject,
				// 	content:		oldCommandContent
				// })
		// 	}
		// })
		return commands
	}
	private _defaultCommandReceiver (_time: number, cmd: ShotokuCommand, context: CommandContext, timelineObjId: string): Promise<any> {

		let cwc: CommandWithContext = {
			context: context,
			command: cmd,
			timelineObjId: timelineObjId
		}
		this.emit('debug', cwc)

		try {
			if (this._shotoku.connected) {
				this._shotoku.send(cmd).catch(e => {
					throw new Error(e)
				})
			}

			return Promise.resolve()
		} catch (e) {
			this.emit('commandError', e, cwc)
			return Promise.resolve()
		}
	}
}
