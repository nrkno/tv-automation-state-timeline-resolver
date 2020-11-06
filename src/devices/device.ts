import _ from 'underscore'
import { TimelineState } from 'superfly-timeline'
import { Mappings, DeviceType, ExpectedPlayoutItemContent } from '../types/src'
import { EventEmitter } from 'events'
import { CommandReport, DoOnTime } from '../doOnTime'
import { DeviceInitOptions, DeviceOptionsAny } from '../types/src/device'
/*
	This is a base class for all the Device wrappers.
	The Device wrappers will
*/

export interface DeviceCommand {
	time: number
	deviceId: string
	command: any
}

export interface DeviceCommandContainer {
	deviceId: string
	commands: Array<DeviceCommand>
}
export interface CommandWithContext {
	context: any
	timelineObjId: string
	command: any
}
export enum StatusCode {
	UNKNOWN = 0, // Status unknown
	GOOD = 1, // All good and green
	WARNING_MINOR = 2, // Everything is not OK, operation is not affected
	WARNING_MAJOR = 3, // Everything is not OK, operation might be affected
	BAD = 4, // Operation affected, possible to recover
	FATAL = 5, // Operation affected, not possible to recover without manual interference
}
export interface DeviceStatus {
	statusCode: StatusCode
	messages?: Array<string>
	active: boolean
}

export function literal<T>(o: T) {
	return o
}

export interface IDevice {
	init: (initOptions: DeviceInitOptions) => Promise<boolean>

	getCurrentTime: () => number

	prepareForHandleState: (newStateTime: number) => void
	handleState: (newState: TimelineState, mappings: Mappings) => void
	clearFuture: (clearAfterTime: number) => void
	canConnect: boolean
	connected: boolean

	makeReady: (_okToDestroyStuff?: boolean, activeRundownId?: string) => Promise<void>
	standDown: (_okToDestroyStuff?: boolean) => Promise<void>
	getStatus: () => DeviceStatus

	deviceId: string
	deviceName: string
	deviceType: DeviceType
	deviceOptions: DeviceOptionsAny

	instanceId: number
	startTime: number
}
/**
 * Base class for all Devices to inherit from. Defines the API that the conductor
 * class will use.
 */
export abstract class Device extends EventEmitter implements IDevice {
	private _getCurrentTime: () => Promise<number> | number

	private _deviceId: string

	private _currentTimeDiff = 0
	private _currentTimeUpdated = 0
	private _instanceId: number
	private _startTime: number

	public useDirectTime = false
	protected _deviceOptions: DeviceOptionsAny
	protected _reportAllCommands = false
	protected _isActive = true

	constructor(deviceId: string, deviceOptions: DeviceOptionsAny, getCurrentTime: () => Promise<number>) {
		super()
		this.on = super.on
		this.emit = super.emit

		this._deviceId = deviceId
		this._deviceOptions = deviceOptions

		this._instanceId = Math.floor(Math.random() * 10000)
		this._startTime = Date.now()

		this._reportAllCommands = !!deviceOptions.reportAllCommands

		if (process.env.JEST_WORKER_ID !== undefined) {
			// running in Jest test environment.
			// Because Jest does a lot of funky stuff with the timing, we have to pull the time directly.
			this.useDirectTime = true

			// Hack around the function mangling done by threadedClass
			const getCurrentTimeTmp = getCurrentTime as any
			if (getCurrentTimeTmp && getCurrentTimeTmp.inner) {
				getCurrentTime = getCurrentTimeTmp.inner
			}
		}

		this._getCurrentTime = getCurrentTime

		this._updateCurrentTime()
	}

	/**
	 * Connect to the device, resolve the promise when ready.
	 * @param initOptions Device-specific options
	 */
	abstract init(initOptions: DeviceInitOptions): Promise<boolean>
	terminate(): Promise<boolean> {
		return Promise.resolve(true)
	}
	getCurrentTime(): number {
		if (this.useDirectTime) {
			// Used when running in test
			return this._getCurrentTime() as number
		}
		if (Date.now() - this._currentTimeUpdated > 5 * 60 * 1000) {
			this._updateCurrentTime()
		}
		return Date.now() - this._currentTimeDiff
	}

	/** Called from Conductor when a new state is about to be handled soon */
	abstract prepareForHandleState(newStateTime: number): void
	/** Called from Conductor when a new state is to be handled */
	abstract handleState(newState: TimelineState, mappings: Mappings): void

	/** To be called by children first in .handleState */
	protected onHandleState(_newState: TimelineState, mappings: Mappings) {
		this.updateIsActive(mappings)
	}
	/**
	 * Clear any scheduled commands after this time
	 * @param clearAfterTime
	 */
	abstract clearFuture(clearAfterTime: number): void
	abstract get canConnect(): boolean
	abstract get connected(): boolean

	/**
	 * The makeReady method could be triggered at a time before broadcast
	 * Whenever we know that the user want's to make sure things are ready for broadcast
	 * The exact implementation differ between different devices
	 * @param okToDestroyStuff If true, the device may do things that might affect the output (temporarily)
	 */
	makeReady(_okToDestroyStuff?: boolean, _activeRundownId?: string): Promise<void> {
		// This method should be overwritten by child
		return Promise.resolve()
	}
	/**
	 * The standDown event could be triggered at a time after broadcast
	 * The exact implementation differ between different devices
	 * @param okToDestroyStuff If true, the device may do things that might affect the output (temporarily)
	 */
	standDown(_okToDestroyStuff?: boolean): Promise<void> {
		// This method should be overwritten by child
		return Promise.resolve()
	}
	abstract getStatus(): DeviceStatus

	get deviceId() {
		return this._deviceId
	}
	/**
	 * A human-readable name for this device
	 */
	abstract get deviceName(): string
	abstract get deviceType(): DeviceType
	get deviceOptions(): DeviceOptionsAny {
		return this._deviceOptions
	}
	get supportsExpectedPlayoutItems(): boolean {
		return false
	}
	public handleExpectedPlayoutItems(_expectedPlayoutItems: Array<ExpectedPlayoutItemContent>): void {
		// When receiving a new list of playoutItems.
		// by default, do nothing
	}
	get isActive(): boolean {
		return this._isActive
	}

	private _updateCurrentTime() {
		if (this._getCurrentTime) {
			const startTime = Date.now()
			Promise.resolve(this._getCurrentTime())
				.then((parentTime) => {
					const endTime = Date.now()
					const clientTime = Math.round((startTime + endTime) / 2)

					this._currentTimeDiff = clientTime - parentTime
					this._currentTimeUpdated = endTime
				})
				.catch((err) => {
					this.emit('error', 'device._updateCurrentTime', err)
				})
		}
	}

	// Overide EventEmitter.on() for stronger typings:
	on: ((event: 'info', listener: (info: string) => void) => this) &
		((event: 'warning', listener: (warning: string) => void) => this) &
		((event: 'error', listener: (context: string, err: Error) => void) => this) &
		((event: 'debug', listener: (...debug: any[]) => void) => this) &
		/** The connection status has changed */
		((event: 'connectionChanged', listener: (status: DeviceStatus) => void) => this) &
		/** A message to the resolver that something has happened that warrants a reset of the resolver (to re-run it again) */
		((event: 'resetResolver', listener: () => void) => this) &
		/** A report that a command was sent too late */
		((event: 'slowCommand', listener: (commandInfo: string) => void) => this) &
		/** Something went wrong when executing a command  */
		((event: 'commandError', listener: (error: Error, context: CommandWithContext) => void) => this)

	// Overide EventEmitter.emit() for stronger typings:
	emit: ((event: 'info', info: string) => boolean) &
		((event: 'warning', warning: string) => boolean) &
		((event: 'error', context: string, err: Error) => boolean) &
		((event: 'debug', ...debug: any[]) => boolean) &
		((event: 'connectionChanged', status: DeviceStatus) => boolean) &
		((event: 'resetResolver') => boolean) &
		((event: 'slowCommand', commandInfo: string) => boolean) &
		((event: 'commandReport', commandReport: CommandReport) => boolean) &
		((event: 'commandError', error: Error, context: CommandWithContext) => boolean)

	public get instanceId(): number {
		return this._instanceId
	}
	public get startTime(): number {
		return this._startTime
	}
	protected handleDoOnTime(doOnTime: DoOnTime, deviceType: string) {
		doOnTime.on('error', (e) => this.emit('error', `${deviceType}.doOnTime`, e))
		doOnTime.on('slowCommand', (msg) => this.emit('slowCommand', this.deviceName + ': ' + msg))
		doOnTime.on('commandReport', (commandReport) => {
			if (this._reportAllCommands) {
				this.emit('commandReport', commandReport)
			}
		})
	}
	private updateIsActive(mappings: Mappings) {
		// If there are no mappings assigned to this device, it is considered inactive

		const ownMappings: Mappings = {}
		let isActive = false

		_.each(mappings, (mapping, layerId) => {
			if (mapping.deviceId === this.deviceId) {
				isActive = true
				ownMappings[layerId] = mapping
			}
		})
		this._isActive = isActive
	}
}

/**
 * Basic class that devices with state tracking can inherit from. Defines some
 * extra convenience methods for tracking state while inheriting all other methods
 * from the Device class.
 */
export abstract class DeviceWithState<T> extends Device {
	private _states: { [time: string]: T } = {}
	private _setStateCount = 0

	/**
	 * Get the last known state before a point time. Useful for creating device
	 * diffs.
	 * @param time
	 */
	protected getStateBefore(time: number): { state: T; time: number } | null {
		let foundTime = 0
		let foundState: T | null = null
		_.each(this._states, (state: T, stateTimeStr: string) => {
			const stateTime = parseFloat(stateTimeStr)
			if (stateTime > foundTime && stateTime < time) {
				foundState = state
				foundTime = stateTime
			}
		})
		if (foundState) {
			return {
				state: foundState,
				time: foundTime,
			}
		}
		return null
	}
	/**
	 * Get the last known state at a point in time. Useful for creating device
	 * diffs.
	 *
	 * @todo is this literally the same as "getStateBefore(time + 1)"?
	 *
	 * @param time
	 */
	protected getState(time?: number): { state: T; time: number } | null {
		if (time === undefined) {
			time = this.getCurrentTime()
		}
		let foundTime = 0
		let foundState: T | null = null
		_.each(this._states, (state: T, stateTimeStr: string) => {
			const stateTime = parseFloat(stateTimeStr)
			if (stateTime > foundTime && stateTime <= time!) {
				foundState = state
				foundTime = stateTime
			}
		})
		if (foundState) {
			return {
				state: foundState,
				time: foundTime,
			}
		}
		return null
	}
	/**
	 * Saves a state on a certain time point. Overwrites any previous state
	 * saved at the same time. Removes any state after this time point.
	 * @param state
	 * @param time
	 */
	protected setState(state: T, time: number) {
		if (!time) throw new Error('setState: falsy time')
		this.cleanUpStates(0, time) // remove states after this time, as they are not relevant anymore

		this._states[time + ''] = state

		this._setStateCount++
		if (this._setStateCount > 10) {
			this._setStateCount = 0

			// Clean up old states:
			const stateBeforeNow = this.getStateBefore(this.getCurrentTime())
			if (stateBeforeNow && stateBeforeNow.time) {
				this.cleanUpStates(stateBeforeNow.time - 1, 0)
			}
		}
	}
	/**
	 * Sets a windows outside of which all states will be removed.
	 * @param removeBeforeTime
	 * @param removeAfterTime
	 */
	protected cleanUpStates(removeBeforeTime: number, removeAfterTime: number) {
		_.each(_.keys(this._states), (stateTimeStr: string) => {
			const stateTime = parseFloat(stateTimeStr)
			if (
				(removeBeforeTime && stateTime <= removeBeforeTime) ||
				(removeAfterTime && stateTime >= removeAfterTime) ||
				!stateTime
			) {
				delete this._states[stateTime]
			}
		})
	}
	/**
	 * Removes all states
	 */
	protected clearStates() {
		_.each(_.keys(this._states), (time: string) => {
			delete this._states[time]
		})
	}
}
