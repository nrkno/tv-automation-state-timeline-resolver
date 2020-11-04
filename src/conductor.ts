import * as _ from 'underscore'
import {
	TimelineState,
	ResolvedTimelineObjectInstance,
	ResolvedStates,
	TimelineObject
} from 'superfly-timeline'

import { CommandWithContext } from './devices/device'
import { CasparCGDevice, DeviceOptionsCasparCGInternal } from './devices/casparCG'
import { AbstractDevice, DeviceOptionsAbstractInternal } from './devices/abstract'
import { HTTPSendDevice, DeviceOptionsHTTPSendInternal } from './devices/httpSend'
import {
	Mappings,
	Mapping,
	DeviceType,
	ResolvedTimelineObjectInstanceExtended,
	TSRTimeline
} from './types/src'
import { AtemDevice, DeviceOptionsAtemInternal } from './devices/atem'
import { EventEmitter } from 'events'
import { LawoDevice, DeviceOptionsLawoInternal } from './devices/lawo'
import { PanasonicPtzDevice, DeviceOptionsPanasonicPTZInternal } from './devices/panasonicPTZ'
import { HyperdeckDevice, DeviceOptionsHyperdeckInternal } from './devices/hyperdeck'
import { DoOnTime } from './doOnTime'
import { TCPSendDevice, DeviceOptionsTCPSendInternal } from './devices/tcpSend'
import { PharosDevice, DeviceOptionsPharosInternal } from './devices/pharos'
import { OSCMessageDevice, DeviceOptionsOSCInternal } from './devices/osc'
import { DeviceContainer } from './devices/deviceContainer'
import { MemUsageReport, threadedClass, ThreadedClass, ThreadedClassManager } from 'threadedclass'
import { AsyncResolver } from './AsyncResolver'
import { HTTPWatcherDevice, DeviceOptionsHTTPWatcherInternal } from './devices/httpWatcher'
import { QuantelDevice, DeviceOptionsQuantelInternal } from './devices/quantel'
import { SisyfosMessageDevice, DeviceOptionsSisyfosInternal } from './devices/sisyfos'
import { SingularLiveDevice, DeviceOptionsSingularLiveInternal } from './devices/singularLive'
import { VMixDevice, DeviceOptionsVMixInternal } from './devices/vmix'

import { VizMSEDevice, DeviceOptionsVizMSEInternal } from './devices/vizMSE'
import PQueue from 'p-queue'
import * as PAll from 'p-all'
import PTimeout from 'p-timeout'
import { ShotokuDevice, DeviceOptionsShotokuInternal } from './devices/shotoku'

export { DeviceContainer }
export { CommandWithContext }

export const LOOKAHEADTIME = 5000 // Will look ahead this far into the future
export const PREPARETIME = 2000 // Will prepare commands this time before the event is to happen
export const MINTRIGGERTIME = 10 // Minimum time between triggers
export const MINTIMEUNIT = 1 // Minimum unit of time

/** When resolving and the timeline has repeating objects, only resolve this far into the future */
const RESOLVE_LIMIT_TIME = 10000

export const DEFAULT_PREPARATION_TIME = 20 // When resolving "now", move this far into the future, to account for computation times

export type TimelineTriggerTimeResult = Array<{id: string, time: number}>

export { Device } from './devices/device'
// export interface Device {}

export interface ConductorOptions {
	// devices: {
	// 	[deviceName: string]: DeviceOptions
	// },
	initializeAsClear?: boolean // don't do any initial checks with devices to determine state, instead assume that everything is clear, black and quiet
	getCurrentTime?: () => number
	autoInit?: boolean
	multiThreadedResolver?: boolean
	useCacheWhenResolving?: boolean
	proActiveResolve?: boolean
}
interface TimelineCallback {
	time: number
	id: string
	callBack?: string
	callBackStopped?: string
	callBackData: any
	startTime: number
}
type TimelineCallbacks = {[key: string]: TimelineCallback}
const CALLBACK_WAIT_TIME = 50
interface CallbackInstance {
	playing: boolean | undefined

	playChanged: boolean
	playTime?: number | null | undefined
	playCallback?: QueueCallback

	endChanged: boolean
	endTime?: number | null | undefined
	endCallback?: QueueCallback
}
interface QueueCallback {
	type: 'start' | 'stop'
	time: number
	instanceId: string
	callBack: string
	callBackData: any
}
export interface StatReport {
	reason?: string
	timelineStartResolve: number
	timelineResolved: number
	stateHandled: number
	done: number
}

/**
 * The Conductor class serves as the main class for interacting. It contains
 * methods for setting mappings, timelines and adding/removing devices. It keeps
 * track of when to resolve the timeline and updates the devices with new states.
 */
export class Conductor extends EventEmitter {

	private _logDebug: boolean = false
	private _timeline: TSRTimeline = []
	private _mappings: Mappings = {}

	private _options: ConductorOptions

	private devices: {[deviceId: string]: DeviceContainer} = {}

	private _getCurrentTime?: () => number

	private _nextResolveTime: number = 0
	private _resolvedStates: {
		resolvedStates: ResolvedStates | null,
		resolveTime: number
	} = {
		resolvedStates: null,
		resolveTime: 0
	}
	private _resolveTimelineTrigger: NodeJS.Timer
	private _isInitialized: boolean = false
	private _doOnTime: DoOnTime
	private _multiThreadedResolver: boolean = false
	private _useCacheWhenResolving: boolean = false

	private _callbackInstances: {[instanceId: number]: CallbackInstance} = {}
	private _triggerSendStartStopCallbacksTimeout: NodeJS.Timer | null = null
	private _sentCallbacks: TimelineCallbacks = {}

	private _actionQueue: PQueue = new PQueue({
		concurrency: 1
	})

	private _statMeasureStart: number = 0
	private _statMeasureReason: string = ''
	private _statReports: StatReport[] = []

	private _resolver: ThreadedClass<AsyncResolver>

	private _interval: NodeJS.Timer
	private _timelineHash: string | undefined

	constructor (options: ConductorOptions = {}) {
		super()
		this._options = options

		this._multiThreadedResolver = !!options.multiThreadedResolver
		this._useCacheWhenResolving = !!options.useCacheWhenResolving

		if (options.getCurrentTime) this._getCurrentTime = options.getCurrentTime

		this._interval = setInterval(() => {
			if (this.timeline) {
				this._resolveTimeline()
			}
		}, 2500)
		this._doOnTime = new DoOnTime(() => {
			return this.getCurrentTime()
		})
		this._doOnTime.on('error', e => this.emit('error', e))
		// this._doOnTime.on('callback', (...args) => {
		// 	this.emit('timelineCallback', ...args)
		// })

		if (options.autoInit) {
			this.init()
			.catch((e) => {
				this.emit('error','Error during auto-init: ', e)
			})
		}

	}
	/**
	 * Initializates the resolver, with optional multithreading
	 */
	public async init (): Promise<void> {
		this._resolver = await threadedClass<AsyncResolver, typeof AsyncResolver>(
			'../dist/AsyncResolver.js',
			'AsyncResolver',
			[
				r => { this.emit('setTimelineTriggerTime', r) }
			],
			{
				threadUsage: this._multiThreadedResolver ? 1 : 0,
				autoRestart: true,
				disableMultithreading: !this._multiThreadedResolver,
				instanceName: 'resolver'
			}
		)

		this._isInitialized = true
		this.resetResolver()
	}
	/**
	 * Returns a nice, synchronized time.
	 */
	public getCurrentTime () {

		if (this._getCurrentTime) {
			// return 0
			return this._getCurrentTime()
		} else {
			return Date.now()
		}
	}
	/**
	 * Returns the mappings
	 */
	get mapping (): Mappings {
		return this._mappings
	}
	/**
	 * Returns the current timeline
	 */
	get timeline (): TSRTimeline {
		return this._timeline
	}
	/**
	 * Sets a new timeline and resets the resolver.
	 */
	setTimelineAndMappings (timeline: TSRTimeline, mappings?: Mappings) {
		this.statStartMeasure('timeline received')
		this._timeline = timeline
		if (mappings) this._mappings = mappings

		// We've got a new timeline, anything could've happened at this point
		// Highest priority right now is to determine if any commands have to be sent RIGHT NOW
		// After that, we'll move further ahead in time, creating commands ready for scheduling

		this.resetResolver()

	}
	get timelineHash (): string | undefined {
		return this._timelineHash
	}
	set timelineHash (hash: string | undefined) {
		this._timelineHash = hash
	}
	get logDebug (): boolean {
		return this._logDebug
	}
	set logDebug (val: boolean) {
		this._logDebug = val
	}

	public getDevices (): Array<DeviceContainer> {
		return _.values(this.devices)
	}
	public getDevice (deviceId: string): DeviceContainer {
		return this.devices[deviceId]
	}

	/**
	 * Adds a a device that can be referenced by the timeline and mappings.
	 * @param deviceId Id used by the mappings to reference the device.
	 * @param deviceOptions The options used to initalize the device
	 * @returns A promise that resolves with the created device, or rejects with an error message.
	 */
	public async addDevice (deviceId: string, deviceOptions: DeviceOptionsAnyInternal): Promise<DeviceContainer> {
		try {
			let newDevice: DeviceContainer
			let threadedClassOptions = {
				threadUsage: deviceOptions.threadUsage || 1,
				autoRestart: true,
				disableMultithreading: !deviceOptions.isMultiThreaded,
				instanceName: deviceId
			}

			let getCurrentTime = () => { return this.getCurrentTime() }

			if (deviceOptions.type === DeviceType.ABSTRACT) {
				newDevice = await new DeviceContainer().create<AbstractDevice, typeof AbstractDevice>(
					'../../dist/devices/abstract.js',
					'AbstractDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					{
						...threadedClassOptions,
						threadUsage: deviceOptions.isMultiThreaded ? .1 : 0
					}
				)
			} else if (deviceOptions.type === DeviceType.CASPARCG) {
				// Add CasparCG device:
				newDevice = await new DeviceContainer().create<CasparCGDevice, typeof CasparCGDevice>(
					'../../dist/devices/casparCG.js',
					'CasparCGDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.ATEM) {
				newDevice = await new DeviceContainer().create<AtemDevice, typeof AtemDevice>(
					'../../dist/devices/atem.js',
					'AtemDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.HTTPSEND) {
				newDevice = await new DeviceContainer().create<HTTPSendDevice, typeof HTTPSendDevice>(
					'../../dist/devices/httpSend.js',
					'HTTPSendDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.HTTPWATCHER) {
				newDevice = await new DeviceContainer().create<HTTPWatcherDevice, typeof HTTPWatcherDevice>(
					'../../dist/devices/httpWatcher.js',
					'HTTPWatcherDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.LAWO) {
				newDevice = await new DeviceContainer().create<LawoDevice, typeof LawoDevice>(
					'../../dist/devices/lawo.js',
					'LawoDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.TCPSEND) {
				newDevice = await new DeviceContainer().create<TCPSendDevice, typeof TCPSendDevice>(
					'../../dist/devices/tcpSend.js',
					'TCPSendDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.PANASONIC_PTZ) {
				newDevice = await new DeviceContainer().create<PanasonicPtzDevice, typeof PanasonicPtzDevice>(
					'../../dist/devices/panasonicPTZ.js',
					'PanasonicPtzDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.HYPERDECK) {
				newDevice = await new DeviceContainer().create<HyperdeckDevice, typeof HyperdeckDevice>(
					'../../dist/devices/hyperdeck.js',
					'HyperdeckDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.PHAROS) {
				newDevice = await new DeviceContainer().create<PharosDevice, typeof PharosDevice>(
					'../../dist/devices/pharos.js',
					'PharosDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.OSC) {
				newDevice = await new DeviceContainer().create<OSCMessageDevice, typeof OSCMessageDevice>(
					'../../dist/devices/osc.js',
					'OSCMessageDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.QUANTEL) {
				newDevice = await new DeviceContainer().create<QuantelDevice, typeof QuantelDevice>(
					'../../dist/devices/quantel.js',
					'QuantelDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.SHOTOKU) {
				newDevice = await new DeviceContainer().create<ShotokuDevice, typeof ShotokuDevice>(
					'../../dist/devices/shotoku.js',
					'ShotokuDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.SISYFOS) {
				newDevice = await new DeviceContainer().create<SisyfosMessageDevice, typeof SisyfosMessageDevice>(
					'../../dist/devices/sisyfos.js',
					'SisyfosMessageDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.VIZMSE) {
				newDevice = await new DeviceContainer().create<VizMSEDevice, typeof VizMSEDevice>(
					'../../dist/devices/vizMSE.js',
					'VizMSEDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.SINGULAR_LIVE) {
				newDevice = await new DeviceContainer().create<SingularLiveDevice, typeof SingularLiveDevice>(
					'../../dist/devices/singularLive.js',
					'SingularLiveDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else if (deviceOptions.type === DeviceType.VMIX) {
				newDevice = await new DeviceContainer().create<VMixDevice, typeof VMixDevice>(
					'../../dist/devices/vmix.js',
					'VMixDevice',
					deviceId,
					deviceOptions,
					getCurrentTime,
					threadedClassOptions
				)
			} else {
				// @ts-ignore deviceOptions.type is of type "never"
				const type: any = deviceOptions.type
				return Promise.reject(`No matching device type for "${type}" ("${DeviceType[type]}") found in conductor`)
			}

			newDevice.device.on('debug', (...e) => {
				if (this.logDebug) {
					this.emit('debug', newDevice.deviceId, ...e)
				}
			}).catch(console.error)

			newDevice.device.on('resetResolver', () => this.resetResolver()).catch(console.error)

			// Temporary listening to events, these are removed after the devide has been initiated.
			// Todo: split the addDevice function into two separate functions, so that the device is
			// first created, then initated by the consumer, allowing for setup of listeners in between...

			const onDeviceInfo = (...args) 		=> this.emit('info', 	newDevice.instanceId, ...args)
			const onDeviceWarning = (...args) 	=> this.emit('warning', newDevice.instanceId, ...args)
			const onDeviceError = (...args) 	=> this.emit('error', 	newDevice.instanceId, ...args)
			const onDeviceDebug = (...args) 	=> this.emit('debug', 	newDevice.instanceId, ...args)

			newDevice.device.on('info', 	onDeviceInfo).catch(console.error)
			newDevice.device.on('warning', 	onDeviceWarning).catch(console.error)
			newDevice.device.on('error', 	onDeviceError).catch(console.error)
			newDevice.device.on('debug', 	onDeviceDebug).catch(console.error)

			this.emit('info', `Initializing device ${newDevice.deviceId} (${newDevice.instanceId}) of type ${DeviceType[deviceOptions.type]}...`)
			this.devices[deviceId] = newDevice

			// TODO - should the device be on this.devices yet? sounds like we could instruct it to do things before it has initialised?

			await newDevice.device.init(deviceOptions.options)

			await newDevice.reloadProps() // because the device name might have changed after init

			this.emit('info', `Device ${newDevice.deviceId} (${newDevice.instanceId}) initialized!`)

			// Remove listeners, expect consumer to subscribe to them now.

			newDevice.device.removeListener('info', 	onDeviceInfo).catch(console.error)
			newDevice.device.removeListener('warning', 	onDeviceWarning).catch(console.error)
			newDevice.device.removeListener('error', 	onDeviceError).catch(console.error)
			newDevice.device.removeListener('debug', 	onDeviceDebug).catch(console.error)

			return newDevice

		} catch (e) {
			this.emit('error', 'conductor.addDevice', e)
			return Promise.reject(e)
		}
	}
	/**
	 * Safely remove a device
	 * @param deviceId The id of the device to be removed
	 */
	public async removeDevice (deviceId: string): Promise<void> {
		let device = this.devices[deviceId]
		if (device) {
			try {
				await device.device.terminate()
			} catch (e) {
				// An error while terminating is probably not that important, since we'll kill the instance anyway
				this.emit('warning', 'Error when terminating device', e)
			}
			await device.terminate()

			delete this.devices[deviceId]
		} else {
			return Promise.reject('No device found')
		}
	}
	/**
	 * Remove all devices
	 */
	public async destroy (): Promise<void> {

		clearTimeout(this._interval)

		if (this._triggerSendStartStopCallbacksTimeout) clearTimeout(this._triggerSendStartStopCallbacksTimeout)

		await this._mapAllDevices(d => this.removeDevice(d.deviceId))
	}
	/**
	 * Resets the resolve-time, so that the resolving will happen for the point-in time NOW
	 * next time
	 */
	public resetResolver () {
		// reset the resolver through the action queue to make sure it is reset after any currently running timelineResolves
		this._actionQueue.add(async () => {
			this._nextResolveTime = 0 // This will cause _resolveTimeline() to generate the state for NOW
			this._resolvedStates = {
				resolvedStates: null,
				resolveTime: 0
			}
		}).catch(() => {
			this.emit('error', 'Failed to reset the resolvedStates, timeline may not be updated appropriately!')
		})

		this._triggerResolveTimeline()
	}
	/**
	 * Send a makeReady-trigger to all devices
	 */
	public async devicesMakeReady (okToDestroyStuff?: boolean, activeRundownId?: string): Promise<void> {
		await this._actionQueue.add(async () => {
			await this._mapAllDevices((d) => PTimeout(d.device.makeReady(okToDestroyStuff, activeRundownId), 10000, `makeReady for "${d.deviceId}" timed out`))

			this._triggerResolveTimeline()
		})
	}
	/**
	 * Send a standDown-trigger to all devices
	 */
	public async devicesStandDown (okToDestroyStuff?: boolean): Promise<void> {
		await this._actionQueue.add(async () => {
			await this._mapAllDevices((d) => PTimeout(d.device.standDown(okToDestroyStuff), 10000, `standDown for "${d.deviceId}" timed out`))
		})
	}

	public async getThreadsMemoryUsage (): Promise<{ [childId: string]: MemUsageReport }> {
		return ThreadedClassManager.getThreadsMemoryUsage()
	}

	private _mapAllDevices<T> (fcn: (d: DeviceContainer) => Promise<T>): Promise<T[]> {
		return PAll(_.map(_.values(this.devices), d => () => fcn(d)), {
			stopOnError: false
		})
	}

	/**
	 * This is the main resolve-loop.
	 */
	private _triggerResolveTimeline (timeUntilTrigger?: number) {

		// this.emit('info', '_triggerResolveTimeline', timeUntilTrigger)

		if (this._resolveTimelineTrigger) {
			clearTimeout(this._resolveTimelineTrigger)
		}

		if (timeUntilTrigger) {
			// resolve at a later stage
			this._resolveTimelineTrigger = setTimeout(() => {
				this._resolveTimeline()
			}, timeUntilTrigger)
		} else {
			// resolve right away:
			this._resolveTimeline()
		}

	}
	/**
	 * Resolves the timeline for the next resolve-time, generates the commands and passes on the commands.
	 */
	private _resolveTimeline () {
		// this adds it to a queue, make sure it never runs more than once at a time:
		this._actionQueue.add(() => {
			return this._resolveTimelineInner()
			.then((nextResolveTime) => {
				this._nextResolveTime = nextResolveTime || 0
			})
			.catch(e => {
				this.emit('error', 'Caught error in _resolveTimelineInner' + e)
			})
		})
		.catch(e => {
			this.emit('error', 'Caught error in _resolveTimeline.then' + e)
		})
	}
	private async _resolveTimelineInner (): Promise<number | undefined> {
		if (!this._isInitialized) {
			this.emit('warning', 'TSR is not initialized yet')
			return
		}

		let nextResolveTime: number = 0
		let timeUntilNextResolve = LOOKAHEADTIME
		let startTime = Date.now()

		let statMeasureStart: number = this._statMeasureStart
		let statTimeStateHandled: number = 0
		let statTimeTimelineStartResolve: number = 0
		let statTimeTimelineResolved: number = 0

		try {
			/** The point in time this function is run. ( ie "right now") */
			const now = this.getCurrentTime()
			/** The point in time we're targeting. (This can be in the future) */
			let resolveTime: number = this._nextResolveTime

			const estimatedResolveTime = this.estimateResolveTime()

			if (
				resolveTime === 0 || // About to be resolved ASAP
				resolveTime < now + estimatedResolveTime // We're late
			) {
				resolveTime = now + estimatedResolveTime
				this.emit('debug', `resolveTimeline ${resolveTime} (${resolveTime - now} from now) (${estimatedResolveTime}) ---------`)
			} else {
				this.emit('debug', `resolveTimeline ${resolveTime} (${resolveTime - now} from now) -----------------------------`)

				if (resolveTime > now + LOOKAHEADTIME) {
					// If the resolveTime is too far ahead, we'd rather wait and resolve it later.
					this.emit('debug', 'Too far ahead (' + resolveTime + ')')
					this._triggerResolveTimeline(LOOKAHEADTIME)
					return
				}
			}

			// Let all devices know that a new state is about to come in.
			// This is done so that they can clear future commands a bit earlier, possibly avoiding double or conflicting commands
			// const pPrepareForHandleStates = this._mapAllDevices(async (device: DeviceContainer) => {
			// 	await device.device.prepareForHandleState(resolveTime)
			// }).catch(error => {
			// 	this.emit('error', error)
			// })
			// TODO - the PAll way of doing this provokes https://github.com/nrkno/tv-automation-state-timeline-resolver/pull/139
			// The doOnTime calls fire before this, meaning we cleanup the state for a time we have already sent commands for
			const pPrepareForHandleStates: Promise<any> = Promise.all(
				_.map(this.devices, async (device: DeviceContainer): Promise<any> => {
					await device.device.prepareForHandleState(resolveTime)
				})
			).catch(error => {
				this.emit('error', error)
			})

			const applyRecursively = (o: TimelineObject, func: (o: TimelineObject) => void) => {
				func(o)

				if (o.isGroup) {
					_.each(o.children || [], (child: TimelineObject) => {
						applyRecursively(child, func)
					})
				}
			}

			statTimeTimelineStartResolve = Date.now()
			let timeline: TSRTimeline = this.timeline

			// To prevent trying to transfer circular references over IPC we remove
			// any references to the parent property:
			const deleteParent = (o: TimelineObject) => { delete o['parent'] }
			_.each(timeline, (o) => applyRecursively(o, deleteParent))

			// Determine if we can use the pre-resolved timeline:
			let resolvedStates: ResolvedStates
			if (
				this._resolvedStates.resolvedStates &&
				resolveTime >= this._resolvedStates.resolveTime &&
				resolveTime < this._resolvedStates.resolveTime + RESOLVE_LIMIT_TIME
			) {
				// Yes, we can use the previously resolved timeline:
				resolvedStates = this._resolvedStates.resolvedStates
			} else {
				// No, we need to resolve the timeline again:
				let o = await this._resolver.resolveTimeline(
					resolveTime,
					timeline,
					resolveTime + RESOLVE_LIMIT_TIME,
					this._useCacheWhenResolving
				)
				resolvedStates = o.resolvedStates

				this._resolvedStates.resolvedStates = resolvedStates
				this._resolvedStates.resolveTime = resolveTime

				// Apply changes to fixed objects (set "now" triggers to an actual time):
				// This gets persisted on this.timeline, so we only have to do this once
				const nowIdsTime: {[id: string]: number} = {}
				_.each(o.objectsFixed, (o) => nowIdsTime[o.id] = o.time)
				const fixNow = (o: TimelineObject) => {
					if (nowIdsTime[o.id]) {
						if (!_.isArray(o.enable)) {
							o.enable.start = nowIdsTime[o.id]
						}
					}
				}
				_.each(timeline, (o) => applyRecursively(o, fixNow))

			}

			let tlState = await this._resolver.getState(
				resolvedStates,
				resolveTime
			)
			await pPrepareForHandleStates

			statTimeTimelineResolved = Date.now()

			if (this.getCurrentTime() > resolveTime) {
				this.emit('warn', `Resolver is ${this.getCurrentTime() - resolveTime} ms late`)
			}

			const layersPerDevice = this.filterLayersPerDevice(tlState.layers, _.values(this.devices))

			// Push state to the right device:
			await this._mapAllDevices(async (device: DeviceContainer): Promise<void> => {
				// The subState contains only the parts of the state relevant to that device:
				let subState: TimelineState = {
					time: tlState.time,
					layers: layersPerDevice[device.deviceId] || {},
					nextEvents: []
				}
				const removeParent = (o: TimelineState) => {
					for (let key in o) {
						if (key === 'parent') {
							delete o['parent']
						} else if (typeof o[key] === 'object') {
							o[key] = removeParent(o[key])
						}
					}
					return o
				}

				// Pass along the state to the device, it will generate its commands and execute them:
				try {
					await device.device.handleState(removeParent(subState), this._mappings)
				} catch (e) {
					this.emit('error', 'Error in device "' + device.deviceId + '"' + e + ' ' + e.stack)
				}
			})

			statTimeStateHandled = Date.now()

			// Now that we've handled this point in time, it's time to determine what the next point in time is:
			let nextEventTime: number | null = null
			_.each(tlState.nextEvents, event => {
				if (
					event.time &&
					event.time > now &&
					(
						!nextEventTime ||
						event.time < nextEventTime
					)
				) {
					nextEventTime = event.time
				}
			})
			// let nextEventTime = await this._resolver.getNextTimelineEvent(timeline, tlState.time)

			const nowPostExec = this.getCurrentTime()
			if (nextEventTime) {

				timeUntilNextResolve = (
					Math.max(
						MINTRIGGERTIME, // At minimum, we should wait this time
						Math.min(
							LOOKAHEADTIME, // We should wait maximum this time, because we might have deferred a resolving this far ahead
							RESOLVE_LIMIT_TIME, // We should wait maximum this time, because we've only resolved repeating objects this far
							(nextEventTime - nowPostExec) - PREPARETIME
						)
					)
				)
				// resolve at nextEventTime next time:
				nextResolveTime = Math.min(tlState.time + LOOKAHEADTIME, nextEventTime)

			} else {
				// there's nothing ahead in the timeline,
				// Tell the devices that the future is clear:
				await this._mapAllDevices(async (device: DeviceContainer) => {
					try {
						await device.device.clearFuture(tlState.time)
					} catch (e) {
						this.emit('error', 'Error in device "' + device.deviceId + '", clearFuture: ' + e + ' ' + e.stack)
					}
				})

				// resolve at this time then next time (or later):
				nextResolveTime = Math.min(tlState.time)
			}

			// Special function: send callback to Core
			this._doOnTime.clearQueueNowAndAfter(tlState.time)

			let activeObjects: TimelineCallbacks = {}
			_.each(tlState.layers, (instance: ResolvedTimelineObjectInstance) => {

				try {
					if (instance.content.callBack || instance.content.callBackStopped) {
						let callBackId = (
							instance.id +
							instance.content.callBack +
							instance.content.callBackStopped +
							instance.instance.start +
							JSON.stringify(instance.content.callBackData)
						)
						activeObjects[callBackId] = {
							time: instance.instance.start || 0,
							id: instance.id,
							callBack: instance.content.callBack,
							callBackStopped: instance.content.callBackStopped,
							callBackData: instance.content.callBackData,
							startTime: instance.instance.start
						}
					}
				} catch (e) {
					this.emit('error', `callback to core, obj "${instance.id}"`, e)
				}
			})

			this._doOnTime.queue(tlState.time, undefined, (sentCallbacksNew) => {
				this._diffStateForCallbacks(sentCallbacksNew)
			}, activeObjects)

			const resolveDuration = (Date.now() - startTime)
			// Special / hack: report back, for latency statitics:
			if (
				this._timelineHash
			) {
				this.emit('resolveDone', this._timelineHash, resolveDuration)
			}

			this.emit('debug', 'resolveTimeline at time ' + resolveTime + ' done in ' + resolveDuration + 'ms (size: ' + timeline.length + ')')
		} catch (e) {
			this.emit('error', 'resolveTimeline' + e + '\nStack: ' + e.stack)
		}

		// Report time taken to resolve
		this.statReport(statMeasureStart, {
			timelineStartResolve: statTimeTimelineStartResolve,
			timelineResolved: statTimeTimelineResolved,
			stateHandled: statTimeStateHandled,
			done: Date.now()
		})

		// Try to trigger the next resolval
		try {
			this._triggerResolveTimeline(timeUntilNextResolve)
		} catch (e) {
			this.emit('error', 'triggerResolveTimeline', e)
		}
		return nextResolveTime
	}
	/**
	 * Returns a time estimate for the resolval duration based on the amount of
	 * objects on the timeline. If the proActiveResolve option is falsy this
	 * returns 0.
	 */
	estimateResolveTime (): any {
		if (this._options.proActiveResolve) {
			let objectCount = this.timeline.length

			let sizeFactor = Math.pow(objectCount / 50, 0.5) * 50 // a pretty nice-looking graph that levels out when objectCount is larger
			return (
				Math.min(
					200,
					Math.floor(
						DEFAULT_PREPARATION_TIME +
						sizeFactor * 0.5 // add ms for every object (ish) in timeline
					)
				)
			)
		} else {
			return 0
		}
	}

	private _diffStateForCallbacks (activeObjects: TimelineCallbacks) {
		let sentCallbacks: TimelineCallbacks = this._sentCallbacks
		const time = this.getCurrentTime()

		// clear callbacks scheduled after the current tlState
		_.each(sentCallbacks, (o: TimelineCallback, callbackId: string) => {
			if (o.time >= time) {
				delete sentCallbacks[callbackId]
			}
		})
		// Send callbacks for started objects
		_.each(activeObjects, (cb, callBackId) => {

			if (cb.callBack && cb.startTime) {
				if (!sentCallbacks[callBackId]) {
					// Object has started playing
					this._queueCallback(true, {
						type: 'start',
						time: cb.startTime,
						instanceId: cb.id,
						callBack: cb.callBack,
						callBackData: cb.callBackData
					})
				} else {
					// callback already sent, do nothing
				}
			}
		})
		// Send callbacks for stopped objects
		_.each(sentCallbacks, (cb, callBackId: string) => {
			if (cb.callBackStopped && !activeObjects[callBackId]) {

				// Object has stopped playing
				this._queueCallback(false, {
					type: 'stop',
					time: time,
					instanceId: cb.id,
					callBack: cb.callBackStopped,
					callBackData: cb.callBackData
				})

			}
		})
		this._sentCallbacks = activeObjects
	}
	private _queueCallback (playing: boolean, cb: QueueCallback) {
		let o: CallbackInstance

		if (this._callbackInstances[cb.instanceId]) {
			o = this._callbackInstances[cb.instanceId]
		} else {
			o = {
				playing: undefined,
				playChanged: false,
				endChanged: false
			}
			this._callbackInstances[cb.instanceId] = o
		}

		if (o.playing !== playing) {

			this.emit('debug', `_queueCallback ${playing ? 'playing' : 'stopping'} instance ${cb.instanceId}`)

			if (playing) {

				if (
					o.endChanged &&
					o.endTime &&
					Math.abs(cb.time - o.endTime) < CALLBACK_WAIT_TIME
				) {
					// Too little time has passed since last time. Annihilate that event instead:

					o.playing = playing
					o.endTime = undefined
					o.endCallback = undefined
					o.endChanged = false

				} else {
					o.playing = playing
					o.playChanged = true

					o.playTime = cb.time
					o.playCallback = cb
				}
			} else {
				if (
					o.playChanged &&
					o.playTime &&
					Math.abs(cb.time - o.playTime) < CALLBACK_WAIT_TIME
				) {
					// Too little time has passed since last time. Annihilate that event instead:

					o.playing = playing
					o.playTime = undefined
					o.playCallback = undefined
					o.playChanged = false

				} else {
					o.playing = playing
					o.endChanged = true

					o.endTime = cb.time
					o.endCallback = cb
				}
			}
		} else {
			this.emit('warning', `_queueCallback ${playing ? 'playing' : 'stopping'} instance ${cb.instanceId} already playing/stopped`)
		}

		this._triggerSendStartStopCallbacks()
	}
	private _triggerSendStartStopCallbacks () {
		if (!this._triggerSendStartStopCallbacksTimeout) {
			this._triggerSendStartStopCallbacksTimeout = setTimeout(() => {
				this._triggerSendStartStopCallbacksTimeout = null
				this._sendStartStopCallbacks()
			}, CALLBACK_WAIT_TIME)
		}
	}
	private _sendStartStopCallbacks () {

		const now = this.getCurrentTime()

		let haveThingsToSendLater: boolean = false

		const callbacks: QueueCallback[] = []

		_.each(this._callbackInstances, (o: CallbackInstance, instanceId: string) => {
			if (
				o.endChanged &&
				o.endTime &&
				o.endCallback
			) {
				if (o.endTime < now - CALLBACK_WAIT_TIME) {
					callbacks.push(o.endCallback)
					o.endChanged = false
				} else {
					haveThingsToSendLater = true
				}
			}

			if (
				o.playChanged &&
				o.playTime &&
				o.playCallback
			) {
				if (o.playTime < now - CALLBACK_WAIT_TIME) {
					callbacks.push(o.playCallback)
					o.playChanged = false
				} else {
					haveThingsToSendLater = true
				}
			}

			if (
				!haveThingsToSendLater &&
				!o.playChanged &&
				!o.endChanged
			) {
				delete this._callbackInstances[instanceId]
			}
		})

		// Sort the callbacks:
		let callbacksArray = _.values(callbacks).sort((a, b) => {
			if (a.type === 'start' && b.type !== 'start') return 1
			if (a.type !== 'start' && b.type === 'start') return -1

			if ((a.time || 0) > (b.time || 0)) return 1
			if ((a.time || 0) < (b.time || 0)) return -1

			return 0
		})

		// emit callbacks
		_.each(callbacksArray, cb => {
			this.emit('timelineCallback',
				cb.time,
				cb.instanceId,
				cb.callBack,
				cb.callBackData
			)
		})

		if (haveThingsToSendLater) {
			this._triggerSendStartStopCallbacks()
		}
	}

	private statStartMeasure (reason: string) {
		// Start a measure of response times

		if (!this._statMeasureStart) {
			this._statMeasureStart = Date.now()
			this._statMeasureReason = reason
		}
	}
	private statReport (
		startTime: number,
		report: StatReport
	) {
		// Check if the report is from the start of a measuring
		if (
			this._statMeasureStart &&
			this._statMeasureStart === startTime
		) {
			// Save the report:
			const reportDuration: StatReport = {
				reason:				this._statMeasureReason,
				timelineStartResolve: report.timelineStartResolve - startTime,
				timelineResolved:	report.timelineResolved - startTime,
				stateHandled: 		report.stateHandled - startTime,
				done: 				report.done - startTime
			}
			this._statReports.push(reportDuration)
			this._statMeasureStart = 0
			this._statMeasureReason = ''

			this.emit('info', 'statReport', JSON.stringify(reportDuration))
			this.emit('statReport', reportDuration)
		}
	}
	/**
	 * Split the state into substates that are relevant for each device
	 */
	private filterLayersPerDevice (layers: TimelineState['layers'], devices: DeviceContainer[]) {
		const filteredStates: {[deviceId: string]: {[layerId: string]: ResolvedTimelineObjectInstance}} = {}

		const deviceIdAndTypes: {[idAndTyoe: string]: string} = {}

		_.each(devices, device => {
			deviceIdAndTypes[device.deviceId + '__' + device.deviceType] = device.deviceId
		})
		_.each(layers, (o: ResolvedTimelineObjectInstance, layerId: string) => {
			const oExt: ResolvedTimelineObjectInstanceExtended = o
			let mapping: Mapping = this._mappings[o.layer + '']
			if (!mapping && oExt.isLookahead && oExt.lookaheadForLayer) {
				mapping = this._mappings[oExt.lookaheadForLayer]
			}
			if (mapping) {
				const deviceIdAndType = mapping.deviceId + '__' + mapping.device

				if (deviceIdAndTypes[deviceIdAndType]) {
					if (!filteredStates[mapping.deviceId]) {
						filteredStates[mapping.deviceId] = {}
					}
					filteredStates[mapping.deviceId][layerId] = o
				}
			}
		})
		return filteredStates
	}
}
export type DeviceOptionsAnyInternal = (
	DeviceOptionsAbstractInternal |
	DeviceOptionsCasparCGInternal |
	DeviceOptionsAtemInternal |
	DeviceOptionsLawoInternal |
	DeviceOptionsHTTPSendInternal |
	DeviceOptionsHTTPWatcherInternal |
	DeviceOptionsPanasonicPTZInternal |
	DeviceOptionsTCPSendInternal |
	DeviceOptionsHyperdeckInternal |
	DeviceOptionsPharosInternal |
	DeviceOptionsOSCInternal |
	DeviceOptionsSisyfosInternal |
	DeviceOptionsQuantelInternal |
	DeviceOptionsSingularLiveInternal |
	DeviceOptionsVMixInternal |
	DeviceOptionsShotokuInternal |
	DeviceOptionsVizMSEInternal |
	DeviceOptionsSingularLiveInternal |
	DeviceOptionsVizMSEInternal
)
