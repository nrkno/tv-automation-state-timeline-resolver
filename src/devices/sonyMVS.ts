import * as _ from 'underscore'
import {
	DeviceWithState,
	CommandWithContext,
	DeviceStatus,
	StatusCode,
	IDevice,
	literal
} from './device'
import {
	DeviceType,
	Mappings,
	SonyMVSOptions,
	SonyMVSTransitionType,
	TimelineObjSonyMVS,
	TimelineContentTypeSonyMVS,
	MappingSonyMVS,
	MappingSonyMVSType,
	DeviceOptionsSonyMVS
} from '../types/src'
import { DoOnTime, SendMode } from '../doOnTime'

import {
	TimelineState
} from 'superfly-timeline'
import { SonyMVSAPI, SonyMVSCommand, SonyMVSMEXPTCommand, SonyMVSCommandType, METarget } from './sonyMVSApi'

export interface DeviceOptionsSonyMvsInternal extends DeviceOptionsSonyMVS {
	options: (
		DeviceOptionsSonyMVS['options'] &
		{
			commandReceiver?: CommandReceiver
		}
	)
}
export type CommandReceiver = (time: number, cmd: SonyMVSCommand, context: CommandContext, timelineObjId: string) => Promise<any>
interface Command {
	command: SonyMVSCommand
	context: CommandContext
	timelineObjId: string
}
type CommandContext = string
type SonyDeviceState = {
	auxilliaries: { [index: string]: number },
	mixEffects: { [index: string]: {
		input: number,
		transitionType?: SonyMVSTransitionType
		transitionRate?: number

		keyers?: {
			source?: number,
			fill?: number,
			onAir?: boolean
		}[],
	} }
}
/**
 * This is a generic wrapper for any osc-enabled device.
 */
export class SonyMVSDevice extends DeviceWithState<SonyDeviceState> implements IDevice {

	private _doOnTime: DoOnTime
	private _sonyMVS: SonyMVSAPI

	private _commandReceiver: CommandReceiver

	constructor (deviceId: string, deviceOptions: DeviceOptionsSonyMvsInternal, options) {
		super(deviceId, deviceOptions, options)
		if (deviceOptions.options) {
			if (deviceOptions.options.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
			else this._commandReceiver = this._defaultCommandReceiver
		}
		this._doOnTime = new DoOnTime(() => {
			return this.getCurrentTime()
		}, SendMode.BURST, this._deviceOptions)
		this._sonyMVS = new SonyMVSAPI()
		this._sonyMVS.on('error', (info, e) => this.emit(e, info))
		this.handleDoOnTime(this._doOnTime, 'OSC')
	}
	async init (initOptions: SonyMVSOptions): Promise<boolean> {
		try {
			await this._sonyMVS.connect(initOptions.host, initOptions.port)
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
		let oldDeviceState: SonyDeviceState = (this.getStateBefore(previousStateTime) || { state: { auxilliaries: {}, mixEffects: {} } }).state
		let newDeviceState = this.converStateToSonyMVSState(newState, newMappings)

		// Generate commands necessary to transition to the new state
		let commandsToAchieveState = this._diffStates(oldDeviceState, newDeviceState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)
		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(oldDeviceState, newState.time)
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
			statusCode: this._sonyMVS.connected ? StatusCode.GOOD : StatusCode.BAD,
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
		return this._sonyMVS.connected
	}
	/**
	 * Transform the timeline state into a device state, which is in this case also
	 * a timeline state.
	 * @param state
	 */
	converStateToSonyMVSState (state: TimelineState, newMappings: Mappings) {
		const deviceState: SonyDeviceState = {
			auxilliaries: {},
			mixEffects: {}
		}

		_.each(state.layers, (layer, layerName) => {
			const content = layer.content as TimelineObjSonyMVS['content']
			const mapping = newMappings[layerName] as MappingSonyMVS
			if (!mapping) return

			if (content.type === TimelineContentTypeSonyMVS.MixEffect && mapping.mappingType === MappingSonyMVSType.MixEffect) {
				const meIndex = mapping.index
				if (!deviceState.mixEffects[meIndex]) {
					deviceState.mixEffects[meIndex] = {
						input: 0
					}
				}
				deviceState.mixEffects[meIndex].input = content.me.input

				if (content.me.transitionType) {
					deviceState.mixEffects[meIndex].transitionType = content.me.transitionType
				} else {
					deviceState.mixEffects[meIndex].transitionType = SonyMVSTransitionType.CUT
				}

				if (content.me.transitionRate) {
					deviceState.mixEffects[meIndex].transitionRate = content.me.transitionRate
				}

				// TODO - keyers
			}
		})

		return deviceState
	}
	get deviceType () {
		return DeviceType.SONYMVS
	}
	get deviceName (): string {
		return 'Sony MVS ' + this.deviceId
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
	private _diffStates (oldState: SonyDeviceState, newState: SonyDeviceState): Array<Command> {
		// unfortunately we don't know what shots belong to what camera, so we can't do anything smart

		let commands: Array<Command> = []
		
		for (const [index, mixEffect]  of Object.entries(newState.mixEffects)) {
			const oldMixEffect = oldState.mixEffects[index] || { input: 0 }
			if (mixEffect.input !== oldMixEffect.input) {
				commands.push({
					command: literal<SonyMVSMEXPTCommand>({
						commandType: SonyMVSCommandType.ME_XPT,
						mixEffect: Number(index),
						target: METarget.BkgdA, // bkgd a = pgm
						input: mixEffect.input
					}),
					context: `ME Input Changed (${oldMixEffect.input}, ${mixEffect.input})`,
					timelineObjId: ''
				})
			}
		}

		return commands
	}
	private _defaultCommandReceiver (_time: number, cmd: SonyMVSCommand, context: CommandContext, timelineObjId: string): Promise<any> {

		let cwc: CommandWithContext = {
			context: context,
			command: cmd,
			timelineObjId: timelineObjId
		}
		this.emit('debug', cwc)

		try {
			if (this._sonyMVS.connected) {
				this._sonyMVS.send(cmd).catch(e => {
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
