import _ from 'underscore'
import { DeviceWithState, CommandWithContext, DeviceStatus, StatusCode, IDevice } from './device'
import {
	DeviceType,
	OSCMessageCommandContent,
	OSCOptions,
	SomeOSCValue,
	OSCValueType,
	DeviceOptionsOSC,
	Mappings,
} from '../types/src'
import { DoOnTime, SendMode } from '../doOnTime'

import { TimelineState } from 'superfly-timeline'
import * as osc from 'osc'
import * as Easing from '../easings'

export interface DeviceOptionsOSCInternal extends DeviceOptionsOSC {
	options: DeviceOptionsOSC['options'] & {
		commandReceiver?: CommandReceiver
		oscSender?: (msg: osc.OscMessage, address?: string | undefined, port?: number | undefined) => void
	}
}
export type CommandReceiver = (
	time: number,
	cmd: OSCMessageCommandContent,
	context: CommandContext,
	timelineObjId: string
) => Promise<any>
interface Command {
	commandName: 'added' | 'changed' | 'removed'
	content: OSCMessageCommandContent
	context: CommandContext
	timelineObjId: string
}
type CommandContext = string
interface OSCDeviceState {
	[address: string]: OSCDeviceStateContent
}
interface OSCDeviceStateContent extends OSCMessageCommandContent {
	fromTlObject: string
}
/**
 * This is a generic wrapper for any osc-enabled device.
 */
export class OSCMessageDevice extends DeviceWithState<OSCDeviceState> implements IDevice {
	private _doOnTime: DoOnTime
	private _oscClient: osc.UDPPort = new osc.UDPPort({})
	private transitions: {
		[address: string]: {
			started: number
		} & OSCMessageCommandContent
	} = {}
	private transitionInterval: NodeJS.Timer | undefined

	private _commandReceiver: CommandReceiver
	private _oscSender: (msg: osc.OscMessage, address?: string | undefined, port?: number | undefined) => void

	constructor(deviceId: string, deviceOptions: DeviceOptionsOSCInternal, getCurrentTime: () => Promise<number>) {
		super(deviceId, deviceOptions, getCurrentTime)

		if (deviceOptions.options.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
		else this._commandReceiver = this._defaultCommandReceiver
		if (deviceOptions.options.oscSender) this._oscSender = deviceOptions.options.oscSender
		else this._oscSender = this._defaultOscSender

		this._doOnTime = new DoOnTime(
			() => {
				return this.getCurrentTime()
			},
			SendMode.BURST,
			this._deviceOptions
		)
		this.handleDoOnTime(this._doOnTime, 'OSC')
	}
	init(initOptions: OSCOptions): Promise<boolean> {
		this._oscClient = new osc.UDPPort({
			localAddress: '0.0.0.0',
			localPort: 0,

			remoteAddress: initOptions.host,
			remotePort: initOptions.port,
			metadata: true,
		})
		this._oscClient.open()

		return Promise.resolve(true) // This device doesn't have any initialization procedure
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
		// Transform timeline states into device states
		const previousStateTime = Math.max(this.getCurrentTime(), newState.time)
		const oldOSCState: OSCDeviceState = (this.getStateBefore(previousStateTime) || { state: {} }).state

		const newOSCState = this.convertStateToOSCMessage(newState)

		// Generate commands necessary to transition to the new state
		const commandsToAchieveState: Array<any> = this._diffStates(oldOSCState, newOSCState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)
		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newOSCState, newState.time)
	}
	/**
	 * Clear any scheduled commands after this time
	 * @param clearAfterTime
	 */
	clearFuture(clearAfterTime: number) {
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
	makeReady(_okToDestroyStuff?: boolean): Promise<void> {
		return Promise.resolve()
	}

	get canConnect(): boolean {
		return false
	}
	get connected(): boolean {
		return false
	}
	/**
	 * Transform the timeline state into a device state, which is in this case also
	 * a timeline state.
	 * @param state
	 */
	convertStateToOSCMessage(state: TimelineState) {
		const addrToOSCMessage: OSCDeviceState = {}
		const addrToPriority: { [address: string]: number } = {}

		_.each(state.layers, (layer) => {
			const content: OSCDeviceStateContent = {
				...(layer.content as OSCMessageCommandContent),
				fromTlObject: layer.id,
			}
			if (
				(addrToOSCMessage[content.path] && addrToPriority[content.path] <= (layer.priority || 0)) ||
				!addrToOSCMessage[content.path]
			) {
				addrToOSCMessage[content.path] = content
				addrToPriority[content.path] = layer.priority || 0
			}
		})

		return addrToOSCMessage
	}
	get deviceType() {
		return DeviceType.OSC
	}
	get deviceName(): string {
		return 'OSC ' + this.deviceId
	}
	get queue() {
		return this._doOnTime.getQueue()
	}
	/**
	 * Add commands to queue, to be executed at the right time
	 */
	private _addToQueue(commandsToAchieveState: Array<Command>, time: number) {
		_.each(commandsToAchieveState, (cmd: Command) => {
			this._doOnTime.queue(
				time,
				undefined,
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
	 * @param oldOscSendState The assumed current state
	 * @param newOscSendState The desired state of the device
	 */
	private _diffStates(oldOscSendState: OSCDeviceState, newOscSendState: OSCDeviceState): Array<Command> {
		// in this oscSend class, let's just cheat:

		const commands: Array<Command> = []

		_.each(newOscSendState, (newCommandContent: OSCDeviceStateContent, address: string) => {
			const oldLayer = oldOscSendState[address]
			if (!oldLayer) {
				// added!
				commands.push({
					commandName: 'added',
					context: `added: ${newCommandContent.fromTlObject}`,
					timelineObjId: newCommandContent.fromTlObject,
					content: newCommandContent,
				})
			} else {
				// changed?
				if (!_.isEqual(oldLayer, newCommandContent)) {
					// changed!
					commands.push({
						commandName: 'changed',
						context: `changed: ${newCommandContent.fromTlObject}`,
						timelineObjId: newCommandContent.fromTlObject,
						content: newCommandContent,
					})
				}
			}
		})
		// removed
		_.each(oldOscSendState, (oldCommandContent: OSCDeviceStateContent, address) => {
			const newLayer = newOscSendState[address]
			if (!newLayer) {
				// removed!
				commands.push({
					commandName: 'removed',
					context: `removed: ${oldCommandContent.fromTlObject}`,
					timelineObjId: oldCommandContent.fromTlObject,
					content: oldCommandContent,
				})
			}
		})
		return commands
	}
	private _defaultCommandReceiver(
		time: number,
		cmd: OSCMessageCommandContent,
		context: CommandContext,
		timelineObjId: string
	): Promise<any> {
		const cwc: CommandWithContext = {
			context: context,
			command: cmd,
			timelineObjId: timelineObjId,
		}
		this.emit('debug', cwc)

		try {
			if (cmd.transition && cmd.from) {
				const easingType = Easing[cmd.transition.type]
				const easing = (easingType || {})[cmd.transition.direction]

				if (!easing) throw new Error(`Easing "${cmd.transition.type}.${cmd.transition.direction}" not found`)

				for (let i = 0; i < Math.max(cmd.from.length, cmd.values.length); i++) {
					if (cmd.from[i] && cmd.values[i]) {
						if (cmd.from[i].value !== cmd.values[i].value && cmd.from[i].type !== cmd.values[i].type) {
							throw new Error('Cannot interpolate between values of different types')
						}
					}
				}

				this.transitions[cmd.path] = {
					// push the tween
					started: time,
					...cmd,
				}
				this._oscSender({
					// send first parameters
					address: cmd.path,
					args: [...cmd.values].map((o: SomeOSCValue, i: number) => cmd.from![i] || o),
				})

				// trigger loop:
				if (!this.transitionInterval) this.transitionInterval = setInterval(() => this.runAnimation(), 40)
			} else {
				this._oscSender({
					address: cmd.path,
					args: cmd.values,
				})
			}

			return Promise.resolve()
		} catch (e) {
			this.emit('commandError', e, cwc)
			return Promise.resolve()
		}
	}
	private _defaultOscSender(msg: osc.OscMessage, address?: string | undefined, port?: number | undefined): void {
		this._oscClient.send(msg, address, port)
	}
	private runAnimation() {
		for (const addr in this.transitions) {
			// delete old tweens
			if (this.transitions[addr].started + this.transitions[addr].transition!.duration < this.getCurrentTime()) {
				delete this.transitions[addr]
			}
		}

		for (const addr in this.transitions) {
			const tween = this.transitions[addr]
			// check if easing exists:
			if (!tween.transition) continue
			const easingType = Easing[tween.transition.type]
			const easing = (easingType as any)[tween.transition.direction]
			if (easing) {
				// scale time in range 0...1, then calculate progress in range 0..1
				const deltaTime = this.getCurrentTime() - tween.started
				const progress = deltaTime / tween.transition!.duration
				const fraction = easing(progress)
				// calculate individual values:
				const values: Array<SomeOSCValue> = []
				for (let i = 0; i < Math.max(tween.from!.length, tween.values.length); i++) {
					if (!tween.from![i]) {
						values[i] = tween.values[i]
					} else if (!tween.values[i]) {
						values[i] = tween.from![i]
					} else {
						if (tween.from![i].type === OSCValueType.FLOAT && tween.values[i].type === OSCValueType.FLOAT) {
							const oldVal = tween.from![i].value as number
							const newVal = tween.values[i].value as number
							values[i] = {
								type: OSCValueType.FLOAT,
								value: oldVal + (newVal - oldVal) * fraction,
							}
						} else if (
							tween.from![i].type === OSCValueType.INT &&
							tween.values[i].type === OSCValueType.INT
						) {
							const oldVal = tween.from![i].value as number
							const newVal = tween.values[i].value as number
							values[i] = {
								type: OSCValueType.INT,
								value: oldVal + Math.round((newVal - oldVal) * fraction),
							}
						} else {
							values[i] = tween.values[i]
						}
					}
				}

				this._oscSender({
					address: tween.path,
					args: values,
				})
			}
		}

		if (Object.keys(this.transitions).length === 0) {
			clearInterval(this.transitionInterval!)
			this.transitionInterval = undefined
		}
	}
}
