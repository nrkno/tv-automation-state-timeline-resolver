import _ from 'underscore'
import underScoreDeepExtend from 'underscore-deep-extend'
import * as path from 'path'
import { DeviceWithState, CommandWithContext, DeviceStatus, StatusCode } from './device'
import { DeviceType, DeviceOptionsVMix, VMixOptions, Mappings } from '../types/src'
import { DoOnTime, SendMode } from '../doOnTime'

import { TimelineState } from 'superfly-timeline'
import { VMix, VMixStateCommand } from './vmixAPI'
import {
	MappingVMix,
	TimelineContentTypeVMix,
	VMixCommand,
	VMixTransition,
	VMixTransitionType,
	TimelineObjVMixProgram,
	TimelineObjVMixPreview,
	TimelineObjVMixAudio,
	TimelineObjVMixFader,
	TimelineObjVMixOutput,
	TimelineObjVMixRecording,
	TimelineObjVMixStreaming,
	TimelineObjVMixExternal,
	TimelineObjVMixFadeToBlack,
	TimelineObjVMixOverlay,
	TimelineObjVMixInput,
	VMixInputType,
	VMixTransform,
	VMixInputOverlays,
	MappingVMixType,
	MappingVMixProgram,
	MappingVMixPreview,
	MappingVMixInput,
	MappingVMixAudioChannel,
	MappingVMixOutput,
	MappingVMixOverlay,
} from '../types/src/vmix'

_.mixin({ deepExtend: underScoreDeepExtend(_) })
function deepExtend<T>(destination: T, ...sources: any[]) {
	return (_ as any).deepExtend(destination, ...sources)
}
export interface DeviceOptionsVMixInternal extends DeviceOptionsVMix {
	options: DeviceOptionsVMix['options'] & { commandReceiver?: CommandReceiver }
}
export type CommandReceiver = (
	time: number,
	cmd: VMixStateCommandWithContext,
	context: CommandContext,
	timelineObjId: string
) => Promise<any>
/*interface Command {
	commandName: 'added' | 'changed' | 'removed'
	content: VMixCommandContent
	context: CommandContext
	timelineObjId: string
	layer: string
}*/
type CommandContext = any
export interface VMixStateCommandWithContext {
	command: VMixStateCommand
	context: CommandContext
	timelineId: string
}

/**
 * This is a VMixDevice, it sends commands when it feels like it
 */
export class VMixDevice extends DeviceWithState<VMixStateExtended> {
	private _doOnTime: DoOnTime

	private _commandReceiver: CommandReceiver
	private _vmix: VMix
	private _connected = false
	private _initialized = false

	constructor(deviceId: string, deviceOptions: DeviceOptionsVMixInternal, getCurrentTime: () => Promise<number>) {
		super(deviceId, deviceOptions, getCurrentTime)
		if (deviceOptions.options) {
			if (deviceOptions.options.commandReceiver) this._commandReceiver = deviceOptions.options.commandReceiver
			else this._commandReceiver = this._defaultCommandReceiver
		} else this._commandReceiver = this._defaultCommandReceiver
		this._doOnTime = new DoOnTime(
			() => {
				return this.getCurrentTime()
			},
			SendMode.IN_ORDER,
			this._deviceOptions
		)
		this._doOnTime.on('error', (e) => this.emit('error', 'VMix.doOnTime', e))
		this._doOnTime.on('slowCommand', (msg) => this.emit('slowCommand', this.deviceName + ': ' + msg))
		this._vmix = new VMix()
	}
	init(options: VMixOptions): Promise<boolean> {
		this._vmix.on('connected', () => {
			const time = this.getCurrentTime()
			const state = this._getDefaultState()
			deepExtend(state, { reportedState: this._vmix.state })
			this.setState(state, time)
			this._initialized = true
			this._setConnected(true)
			this.emit('resetResolver')
		})
		this._vmix.on('disconnected', () => {
			this._setConnected(false)
		})
		this._vmix.on('error', (e) => this.emit('error', 'VMix', e))
		this._vmix.on('stateChanged', (state) => this._onVMixStateChanged(state))
		this._vmix.on('debug', (...args) => this.emit('debug', ...args))

		return this._vmix.connect(options)
	}
	private _connectionChanged() {
		this.emit('connectionChanged', this.getStatus())
	}

	private _setConnected(connected: boolean) {
		if (this._connected !== connected) {
			this._connected = connected
			this._connectionChanged()
		}
	}

	private _onVMixStateChanged(newState: VMixState) {
		const time = this.getCurrentTime()
		const oldState: VMixStateExtended = (this.getStateBefore(time) || { state: this._getDefaultState() }).state
		oldState.reportedState = newState
		this.setState(oldState, time)
	}

	private _getDefaultInputState(num: number): VMixInput {
		return {
			number: num,
			position: 0,
			muted: true,
			loop: false,
			playing: false,
			volume: 100,
			balance: 0,
			fade: 0,
			audioBuses: 'M',
			audioAuto: true,
			transform: {
				zoom: 1,
				panX: 0,
				panY: 0,
				alpha: 255,
			},
			overlays: {},
		}
	}

	private _getDefaultInputsState(count: number): { [key: string]: VMixInput } {
		const defaultInputs: { [key: string]: VMixInput } = {}
		for (let i = 1; i <= count; i++) {
			defaultInputs[i] = this._getDefaultInputState(i)
		}
		return defaultInputs
	}

	private _getDefaultState(): VMixStateExtended {
		return {
			reportedState: {
				version: '',
				edition: '',
				fixedInputsCount: 0,
				inputs: this._getDefaultInputsState(this._vmix.state?.fixedInputsCount || 8), // does a default of 8 make sense here?
				overlays: _.map([1, 2, 3, 4, 5, 6], (num) => {
					return {
						number: num,
						input: undefined,
					}
				}),
				mixes: _.map([1, 2, 3, 4], (num) => {
					return {
						number: num,
						program: undefined,
						preview: undefined,
						transition: { effect: VMixTransitionType.Cut, duration: 0 },
					}
				}),
				fadeToBlack: false,
				faderPosition: 0,
				recording: false,
				external: false,
				streaming: false,
				playlist: false,
				multiCorder: false,
				fullscreen: false,
				audio: [],
			},
			outputs: {
				'2': { source: 'Program' },
				'3': { source: 'Program' },
				'4': { source: 'Program' },
				External2: { source: 'Program' },
				Fullscreen: { source: 'Program' },
				Fullscreen2: { source: 'Program' },
			},
			inputLayers: {},
		}
	}

	/** Called by the Conductor a bit before a .handleState is called */
	prepareForHandleState(newStateTime: number): void {
		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(newStateTime + 0.1)
		this.cleanUpStates(0, newStateTime + 0.1)
	}

	handleState(newState: TimelineState, newMappings: Mappings): void {
		super.onHandleState(newState, newMappings)
		if (!this._initialized) {
			// before it's initialized don't do anything
			this.emit('warning', 'VMix not initialized yet')
			return
		}

		const previousStateTime = Math.max(this.getCurrentTime() + 0.1, newState.time)
		const oldState: VMixStateExtended = (
			this.getStateBefore(previousStateTime) || { state: this._getDefaultState() }
		).state

		const newVMixState = this.convertStateToVMix(newState, newMappings)

		const commandsToAchieveState: Array<any> = this._diffStates(oldState, newVMixState)

		// clear any queued commands later than this time:
		this._doOnTime.clearQueueNowAndAfter(previousStateTime)

		// add the new commands to the queue:
		this._addToQueue(commandsToAchieveState, newState.time)

		// store the new state, for later use:
		this.setState(newVMixState, newState.time)
	}

	clearFuture(clearAfterTime: number): void {
		// Clear any scheduled commands after this time
		this._doOnTime.clearQueueAfter(clearAfterTime)
	}

	async terminate(): Promise<boolean> {
		this._doOnTime.dispose()
		await this._vmix.dispose()
		return true
	}

	getStatus(): DeviceStatus {
		let statusCode = StatusCode.GOOD
		const messages: Array<string> = []

		if (!this._connected) {
			statusCode = StatusCode.BAD
			messages.push('Not connected')
		}

		return {
			statusCode: statusCode,
			messages: messages,
			active: this.isActive,
		}
	}

	async makeReady(okToDestroyStuff?: boolean): Promise<void> {
		if (okToDestroyStuff) {
			// do something?
		}
	}

	get canConnect(): boolean {
		return false
	}

	get connected(): boolean {
		return false
	}

	convertStateToVMix(state: TimelineState, mappings: Mappings): VMixStateExtended {
		if (!this._initialized) throw Error('convertStateToVMix cannot be used before inititialized')

		const deviceState = this._getDefaultState()

		// Sort layer based on Mapping type (to make sure audio is after inputs) and Layer name
		const sortedLayers = _.sortBy(
			_.map(state.layers, (tlObject, layerName) => ({
				layerName,
				tlObject,
				mapping: mappings[layerName] as MappingVMix,
			})).sort((a, b) => a.layerName.localeCompare(b.layerName)),
			(o) => o.mapping.mappingType
		)

		_.each(sortedLayers, ({ tlObject, layerName, mapping }) => {
			if (mapping) {
				switch (mapping.mappingType) {
					case MappingVMixType.Program:
						if (tlObject.content.type === TimelineContentTypeVMix.PROGRAM) {
							const vmixTlProgram = (tlObject as any) as TimelineObjVMixProgram
							const mixProgram = ((mapping as MappingVMixProgram).index || 1) - 1
							if (vmixTlProgram.content.input !== undefined) {
								this.switchToInput(
									vmixTlProgram.content.input,
									deviceState,
									mixProgram,
									vmixTlProgram.content.transition
								)
							} else if (vmixTlProgram.content.inputLayer) {
								this.switchToInput(
									vmixTlProgram.content.inputLayer,
									deviceState,
									mixProgram,
									vmixTlProgram.content.transition,
									true
								)
							}
						}
						break
					case MappingVMixType.Preview:
						if (tlObject.content.type === TimelineContentTypeVMix.PREVIEW) {
							const vmixTlPreview = (tlObject as any) as TimelineObjVMixPreview
							const mixPreview = ((mapping as MappingVMixPreview).index || 1) - 1
							if (vmixTlPreview.content.input)
								deviceState.reportedState.mixes[mixPreview].preview = vmixTlPreview.content.input
						}
						break
					case MappingVMixType.AudioChannel:
						if (tlObject.content.type === TimelineContentTypeVMix.AUDIO) {
							const vmixTlAudio = (tlObject as any) as TimelineObjVMixAudio
							const vmixTlAudioPicked = _.pick(
								vmixTlAudio.content,
								'volume',
								'balance',
								'audioAuto',
								'audioBuses',
								'muted',
								'fade'
							)
							const vmixAudioMapping = mapping as MappingVMixAudioChannel
							if (vmixAudioMapping.index) {
								deviceState.reportedState.inputs = this.modifyInput(deviceState, vmixTlAudioPicked, {
									key: vmixAudioMapping.index,
								})
							} else if (vmixAudioMapping.inputLayer) {
								deviceState.reportedState.inputs = this.modifyInput(deviceState, vmixTlAudioPicked, {
									layer: vmixAudioMapping.inputLayer,
								})
							}
						}
						break
					case MappingVMixType.Fader:
						if (tlObject.content.type === TimelineContentTypeVMix.FADER) {
							const vmixTlFader = (tlObject as any) as TimelineObjVMixFader
							deviceState.reportedState.faderPosition = vmixTlFader.content.position
						}
						break
					case MappingVMixType.Recording:
						if (tlObject.content.type === TimelineContentTypeVMix.RECORDING) {
							const vmixTlRecording = (tlObject as any) as TimelineObjVMixRecording
							deviceState.reportedState.recording = vmixTlRecording.content.on
						}
						break
					case MappingVMixType.Streaming:
						if (tlObject.content.type === TimelineContentTypeVMix.STREAMING) {
							const vmixTlStreaming = (tlObject as any) as TimelineObjVMixStreaming
							deviceState.reportedState.streaming = vmixTlStreaming.content.on
						}
						break
					case MappingVMixType.External:
						if (tlObject.content.type === TimelineContentTypeVMix.EXTERNAL) {
							const vmixTlExternal = (tlObject as any) as TimelineObjVMixExternal
							deviceState.reportedState.external = vmixTlExternal.content.on
						}
						break
					case MappingVMixType.FadeToBlack:
						if (tlObject.content.type === TimelineContentTypeVMix.FADE_TO_BLACK) {
							const vmixTlFTB = (tlObject as any) as TimelineObjVMixFadeToBlack
							deviceState.reportedState.fadeToBlack = vmixTlFTB.content.on
						}
						break
					case MappingVMixType.Input:
						if (tlObject.content.type === TimelineContentTypeVMix.INPUT) {
							const vmixTlMedia = (tlObject as any) as TimelineObjVMixInput
							deviceState.reportedState.inputs = this.modifyInput(
								deviceState,
								{
									type: vmixTlMedia.content.inputType,
									playing: vmixTlMedia.content.playing,
									loop: vmixTlMedia.content.loop,
									position: vmixTlMedia.content.seek,
									transform: vmixTlMedia.content.transform,
									overlays: vmixTlMedia.content.overlays,
								},
								{ key: (mapping as MappingVMixInput).index || vmixTlMedia.content.filePath },
								layerName
							)
						}
						break
					case MappingVMixType.Output:
						if (tlObject.content.type === TimelineContentTypeVMix.OUTPUT) {
							const tlObjSetOutput = (tlObject as any) as TimelineObjVMixOutput
							deviceState.outputs[(mapping as MappingVMixOutput).index] = {
								source: tlObjSetOutput.content.source,
								input: tlObjSetOutput.content.input,
							}
						}
						break
					case MappingVMixType.Overlay:
						if (tlObject.content.type === TimelineContentTypeVMix.OVERLAY) {
							const tlObjOverlayInputIn = (tlObject as any) as TimelineObjVMixOverlay
							const overlayIndex = (mapping as MappingVMixOverlay).index - 1
							deviceState.reportedState.overlays[overlayIndex].input = tlObjOverlayInputIn.content.input
						}
						break
				}
			}
		})
		return deviceState
	}

	getFilename(filePath: string): string {
		return path.basename(filePath)
	}

	modifyInput(
		deviceState: VMixStateExtended,
		newInput: VMixInput,
		input: { key?: string | number; layer?: string },
		layerName?: string
	): { [key: string]: VMixInput } {
		const inputs = deviceState.reportedState.inputs
		const newInputPicked = _.pick(newInput, (x) => !_.isUndefined(x))
		let inputKey: string | number | undefined
		if (input.layer) {
			inputKey = deviceState.inputLayers[input.layer]
		} else {
			inputKey = input.key as string | number
		}
		if (inputKey) {
			if (inputKey in inputs) {
				deepExtend(inputs[inputKey], newInputPicked)
			} else {
				const inputState = this._getDefaultInputState(0)
				deepExtend(inputState, newInputPicked)
				inputs[inputKey] = inputState
			}
			if (layerName) {
				deviceState.inputLayers[layerName] = inputKey as string
			}
		}
		return inputs
	}

	switchToInput(
		input: number | string,
		deviceState: VMixStateExtended,
		mix: number,
		transition?: VMixTransition,
		layerToProgram = false
	): void {
		const mixState = deviceState.reportedState.mixes[mix]
		if (
			mixState.program === undefined ||
			mixState.program !== input // mixing numeric and string input names can be dangerous
		) {
			mixState.preview = mixState.program
			mixState.program = input

			mixState.transition = transition || { effect: VMixTransitionType.Cut, duration: 0 }
			mixState.layerToProgram = layerToProgram
		}
	}

	get deviceType(): DeviceType {
		return DeviceType.VMIX
	}

	get deviceName(): string {
		return 'VMix ' + this.deviceId
	}

	get queue(): ReturnType<DoOnTime['getQueue']> {
		return this._doOnTime.getQueue()
	}

	private _addToQueue(commandsToAchieveState: Array<VMixStateCommandWithContext>, time: number): void {
		_.each(commandsToAchieveState, (cmd: VMixStateCommandWithContext) => {
			// add the new commands to the queue:
			this._doOnTime.queue(
				time,
				undefined,
				(cmd: VMixStateCommandWithContext) => {
					return this._commandReceiver(time, cmd, cmd.context, cmd.timelineId)
				},
				cmd
			)
		})
	}

	private _resolveMixState(
		oldVMixState: VMixStateExtended,
		newVMixState: VMixStateExtended
	): Array<VMixStateCommandWithContext> {
		const commands: Array<VMixStateCommandWithContext> = []
		for (let i = 0; i < 4; i++) {
			const oldMixState = oldVMixState.reportedState.mixes[i]
			const newMixState = newVMixState.reportedState.mixes[i]
			if (newMixState.program !== undefined) {
				let nextInput = newMixState.program
				let changeOnLayer = false
				if (newMixState.layerToProgram) {
					nextInput = newVMixState.inputLayers[newMixState.program]
					changeOnLayer =
						newVMixState.inputLayers[newMixState.program] !== oldVMixState.inputLayers[newMixState.program]
				}
				if (oldMixState.program !== newMixState.program || changeOnLayer) {
					commands.push({
						command: {
							command: VMixCommand.TRANSITION,
							effect: changeOnLayer ? VMixTransitionType.Cut : newMixState.transition.effect,
							input: nextInput,
							duration: changeOnLayer ? 0 : newMixState.transition.duration,
							mix: i,
						},
						context: null,
						timelineId: '',
					})
				}
			}

			if (
				oldMixState.program === newMixState.program && // if we're not switching what is on program, because it could break a transition
				newMixState.preview !== undefined &&
				newMixState.preview !== oldMixState.preview
			) {
				commands.push({
					command: {
						command: VMixCommand.PREVIEW_INPUT,
						input: newMixState.preview,
						mix: i,
					},
					context: null,
					timelineId: '',
				})
			}
		}
		// Only set fader bar position if no other transitions are happening
		if (oldVMixState.reportedState.mixes[0].program === newVMixState.reportedState.mixes[0].program) {
			if (newVMixState.reportedState.faderPosition !== oldVMixState.reportedState.faderPosition) {
				commands.push({
					command: {
						command: VMixCommand.FADER,
						value: newVMixState.reportedState.faderPosition || 0,
					},
					context: null,
					timelineId: '',
				})
				// newVMixState.reportedState.program = undefined
				// newVMixState.reportedState.preview = undefined
				newVMixState.reportedState.fadeToBlack = false
			}
		}
		if (oldVMixState.reportedState.fadeToBlack !== newVMixState.reportedState.fadeToBlack) {
			// Danger: Fade to black is toggled, we can't explicitly say that we want it on or off
			commands.push({
				command: {
					command: VMixCommand.FADE_TO_BLACK,
				},
				context: null,
				timelineId: '',
			})
		}
		return commands
	}

	private _resolveInputsState(
		oldVMixState: VMixStateExtended,
		newVMixState: VMixStateExtended
	): Array<VMixStateCommandWithContext> {
		const commands: Array<VMixStateCommandWithContext> = []
		_.each(newVMixState.reportedState.inputs, (input, key) => {
			if (input.name === undefined) {
				input.name = key
			}
			if (!_.has(oldVMixState.reportedState.inputs, key) && input.type !== undefined) {
				const addCommands: Array<VMixStateCommandWithContext> = []
				addCommands.push({
					command: {
						command: VMixCommand.ADD_INPUT,
						value: `${input.type}|${input.name}`,
					},
					context: null,
					timelineId: '',
				})
				addCommands.push({
					command: {
						command: VMixCommand.SET_INPUT_NAME,
						input: this.getFilename(input.name),
						value: input.name,
					},
					context: null,
					timelineId: '',
				})
				this._addToQueue(addCommands, this.getCurrentTime())
			}
			const oldInput = oldVMixState.reportedState.inputs[key] || this._getDefaultInputState(0) // or {} but we assume that a new input has all parameters default
			if (input.playing !== undefined && oldInput.playing !== input.playing && !input.playing) {
				commands.push({
					command: {
						command: VMixCommand.PAUSE_INPUT,
						input: input.name,
					},
					context: null,
					timelineId: '',
				})
			}
			if (oldInput.position !== input.position) {
				commands.push({
					command: {
						command: VMixCommand.SET_POSITION,
						input: key,
						value: input.position ? input.position : 0,
					},
					context: null,
					timelineId: '',
				})
			}
			if (input.loop !== undefined && oldInput.loop !== input.loop) {
				if (input.loop) {
					commands.push({
						command: {
							command: VMixCommand.LOOP_ON,
							input: input.name,
						},
						context: null,
						timelineId: '',
					})
				} else {
					commands.push({
						command: {
							command: VMixCommand.LOOP_OFF,
							input: input.name,
						},
						context: null,
						timelineId: '',
					})
				}
			}
			if (input.muted !== undefined && oldInput.muted !== input.muted && input.muted) {
				commands.push({
					command: {
						command: VMixCommand.AUDIO_OFF,
						input: key,
					},
					context: null,
					timelineId: '',
				})
			}
			if (oldInput.volume !== input.volume && input.volume !== undefined) {
				commands.push({
					command: {
						command: VMixCommand.AUDIO_VOLUME,
						input: key,
						value: input.volume,
						fade: input.fade,
					},
					context: null,
					timelineId: '',
				})
			}
			if (oldInput.balance !== input.balance && input.balance !== undefined) {
				commands.push({
					command: {
						command: VMixCommand.AUDIO_BALANCE,
						input: key,
						value: input.balance,
					},
					context: null,
					timelineId: '',
				})
			}
			if (input.audioAuto !== undefined && oldInput.audioAuto !== input.audioAuto) {
				if (!input.audioAuto) {
					commands.push({
						command: {
							command: VMixCommand.AUDIO_AUTO_OFF,
							input: key,
						},
						context: null,
						timelineId: '',
					})
				} else {
					commands.push({
						command: {
							command: VMixCommand.AUDIO_AUTO_ON,
							input: key,
						},
						context: null,
						timelineId: '',
					})
				}
			}
			if (input.audioBuses !== undefined && oldInput.audioBuses !== input.audioBuses) {
				const oldBuses = (oldInput.audioBuses || '').split(',').filter((x) => x)
				const newBuses = input.audioBuses.split(',').filter((x) => x)
				_.difference(newBuses, oldBuses).forEach((bus) => {
					commands.push({
						command: {
							command: VMixCommand.AUDIO_BUS_ON,
							input: key,
							value: bus,
						},
						context: null,
						timelineId: '',
					})
				})
				_.difference(oldBuses, newBuses).forEach((bus) => {
					commands.push({
						command: {
							command: VMixCommand.AUDIO_BUS_OFF,
							input: key,
							value: bus,
						},
						context: null,
						timelineId: '',
					})
				})
			}
			if (input.muted !== undefined && oldInput.muted !== input.muted && !input.muted) {
				commands.push({
					command: {
						command: VMixCommand.AUDIO_ON,
						input: key,
					},
					context: null,
					timelineId: '',
				})
			}
			if (input.transform !== undefined && !_.isEqual(oldInput.transform, input.transform)) {
				if (oldInput.transform === undefined || input.transform.zoom !== oldInput.transform.zoom) {
					commands.push({
						command: {
							command: VMixCommand.SET_ZOOM,
							input: key,
							value: input.transform.zoom,
						},
						context: null,
						timelineId: '',
					})
				}
				if (oldInput.transform === undefined || input.transform.alpha !== oldInput.transform.alpha) {
					commands.push({
						command: {
							command: VMixCommand.SET_ALPHA,
							input: key,
							value: input.transform.alpha,
						},
						context: null,
						timelineId: '',
					})
				}
				if (oldInput.transform === undefined || input.transform.panX !== oldInput.transform.panX) {
					commands.push({
						command: {
							command: VMixCommand.SET_PAN_X,
							input: key,
							value: input.transform.panX,
						},
						context: null,
						timelineId: '',
					})
				}
				if (oldInput.transform === undefined || input.transform.panY !== oldInput.transform.panY) {
					commands.push({
						command: {
							command: VMixCommand.SET_PAN_Y,
							input: key,
							value: input.transform.panY,
						},
						context: null,
						timelineId: '',
					})
				}
			}
			if (input.overlays !== undefined && !_.isEqual(oldInput.overlays, input.overlays)) {
				_.difference(Object.keys(input.overlays), Object.keys(oldInput.overlays || {})).forEach((index) => {
					commands.push({
						command: {
							command: VMixCommand.SET_INPUT_OVERLAY,
							input: key,
							value: (input.overlays as VMixInputOverlays)[index],
							index: Number(index),
						},
						context: null,
						timelineId: '',
					})
				})
				_.difference(Object.keys(oldInput.overlays || {}), Object.keys(input.overlays)).forEach((index) => {
					commands.push({
						command: {
							command: VMixCommand.SET_INPUT_OVERLAY,
							input: key,
							value: '',
							index: Number(index),
						},
						context: null,
						timelineId: '',
					})
				})
			}
			if (input.playing !== undefined && oldInput.playing !== input.playing && input.playing) {
				commands.push({
					command: {
						command: VMixCommand.PLAY_INPUT,
						input: input.name,
					},
					context: null,
					timelineId: '',
				})
			}
		})
		return commands
	}

	private _resolveInputsRemovalState(
		oldVMixState: VMixStateExtended,
		newVMixState: VMixStateExtended
	): Array<VMixStateCommandWithContext> {
		const commands: Array<VMixStateCommandWithContext> = []
		_.difference(
			Object.keys(oldVMixState.reportedState.inputs),
			Object.keys(newVMixState.reportedState.inputs)
		).forEach((input) => {
			if (oldVMixState.reportedState.inputs[input].type !== undefined) {
				// TODO: either schedule this command for later or make the timeline object long enough to prevent removing while transitioning
				commands.push({
					command: {
						command: VMixCommand.REMOVE_INPUT,
						input: oldVMixState.reportedState.inputs[input].name || input,
					},
					context: null,
					timelineId: '',
				})
			}
		})
		return commands
	}

	private _resolveOverlaysState(
		oldVMixState: VMixStateExtended,
		newVMixState: VMixStateExtended
	): Array<VMixStateCommandWithContext> {
		const commands: Array<VMixStateCommandWithContext> = []
		_.each(newVMixState.reportedState.overlays, (overlay, index) => {
			const oldOverlay = oldVMixState.reportedState.overlays[index]
			if (oldOverlay.input !== overlay.input) {
				if (overlay.input === undefined) {
					commands.push({
						command: {
							command: VMixCommand.OVERLAY_INPUT_OUT,
							value: overlay.number,
						},
						context: null,
						timelineId: '',
					})
				} else {
					commands.push({
						command: {
							command: VMixCommand.OVERLAY_INPUT_IN,
							input: overlay.input,
							value: overlay.number,
						},
						context: null,
						timelineId: '',
					})
				}
			}
		})
		return commands
	}

	private _resolveRecordingState(
		oldVMixState: VMixStateExtended,
		newVMixState: VMixStateExtended
	): Array<VMixStateCommandWithContext> {
		const commands: Array<VMixStateCommandWithContext> = []
		if (oldVMixState.reportedState.recording !== newVMixState.reportedState.recording) {
			if (newVMixState.reportedState.recording) {
				commands.push({
					command: {
						command: VMixCommand.START_RECORDING,
					},
					context: null,
					timelineId: '',
				})
			} else {
				commands.push({
					command: {
						command: VMixCommand.STOP_RECORDING,
					},
					context: null,
					timelineId: '',
				})
			}
		}
		return commands
	}

	private _resolveStreamingState(
		oldVMixState: VMixStateExtended,
		newVMixState: VMixStateExtended
	): Array<VMixStateCommandWithContext> {
		const commands: Array<VMixStateCommandWithContext> = []
		if (oldVMixState.reportedState.streaming !== newVMixState.reportedState.streaming) {
			if (newVMixState.reportedState.streaming) {
				commands.push({
					command: {
						command: VMixCommand.START_STREAMING,
					},
					context: null,
					timelineId: '',
				})
			} else {
				commands.push({
					command: {
						command: VMixCommand.STOP_STREAMING,
					},
					context: null,
					timelineId: '',
				})
			}
		}
		return commands
	}

	private _resolveExternalState(
		oldVMixState: VMixStateExtended,
		newVMixState: VMixStateExtended
	): Array<VMixStateCommandWithContext> {
		const commands: Array<VMixStateCommandWithContext> = []
		if (oldVMixState.reportedState.external !== newVMixState.reportedState.external) {
			if (newVMixState.reportedState.external) {
				commands.push({
					command: {
						command: VMixCommand.START_EXTERNAL,
					},
					context: null,
					timelineId: '',
				})
			} else {
				commands.push({
					command: {
						command: VMixCommand.STOP_EXTERNAL,
					},
					context: null,
					timelineId: '',
				})
			}
		}
		return commands
	}

	private _resolveOutputsState(
		oldVMixState: VMixStateExtended,
		newVMixState: VMixStateExtended
	): Array<VMixStateCommandWithContext> {
		const commands: Array<VMixStateCommandWithContext> = []
		_.map(newVMixState.outputs, (output, name) => {
			if (!_.isEqual(output, oldVMixState.outputs[name as keyof VMixStateExtended['outputs']])) {
				const value = output.source === 'Program' ? 'Output' : output.source
				commands.push({
					command: {
						command: VMixCommand.SET_OUPUT,
						value,
						input: output.input,
						name,
					},
					context: null,
					timelineId: '',
				})
			}
		})
		return commands
	}

	private _diffStates(
		oldVMixState: VMixStateExtended,
		newVMixState: VMixStateExtended
	): Array<VMixStateCommandWithContext> {
		let commands: Array<VMixStateCommandWithContext> = []

		commands = commands.concat(this._resolveInputsState(oldVMixState, newVMixState))
		commands = commands.concat(this._resolveMixState(oldVMixState, newVMixState))
		commands = commands.concat(this._resolveOverlaysState(oldVMixState, newVMixState))
		commands = commands.concat(this._resolveRecordingState(oldVMixState, newVMixState))
		commands = commands.concat(this._resolveStreamingState(oldVMixState, newVMixState))
		commands = commands.concat(this._resolveExternalState(oldVMixState, newVMixState))
		commands = commands.concat(this._resolveOutputsState(oldVMixState, newVMixState))
		commands = commands.concat(this._resolveInputsRemovalState(oldVMixState, newVMixState))

		return commands
	}

	private _defaultCommandReceiver(
		_time: number,
		cmd: VMixStateCommandWithContext,
		context: CommandContext,
		timelineObjId: string
	): Promise<any> {
		const cwc: CommandWithContext = {
			context: context,
			command: cmd,
			timelineObjId: timelineObjId,
		}
		this.emit('debug', cwc)

		return this._vmix.sendCommand(cmd.command).catch((error) => {
			this.emit('commandError', error, cwc)
		})
	}
}

interface VMixOutput {
	source: 'Preview' | 'Program' | 'MultiView' | 'Input'
	input?: number | string
}

export class VMixStateExtended {
	constructor(
		public reportedState: VMixState,
		public outputs: {
			External2: VMixOutput

			'2': VMixOutput
			'3': VMixOutput
			'4': VMixOutput

			Fullscreen: VMixOutput
			Fullscreen2: VMixOutput
		},
		public inputLayers: { [key: string]: string }
	) {
		//
	}
}

export class VMixState {
	constructor(
		public version: string,
		public edition: string, // TODO: Enuum, need list of available editions: Trial
		public fixedInputsCount: number,
		public inputs: { [key: string]: VMixInput },
		public overlays: VMixOverlay[],
		public mixes: VMixMix[],
		public fadeToBlack: boolean,
		public recording: boolean,
		public external: boolean,
		public streaming: boolean,
		public playlist: boolean,
		public multiCorder: boolean,
		public fullscreen: boolean,
		public audio: VMixAudioChannel[],
		public faderPosition?: number
	) {
		//
	}
}

export interface VMixMix {
	number: number
	program: string | number | undefined
	preview: string | number | undefined
	transition: VMixTransition
	layerToProgram?: boolean
}

export interface VMixInput {
	number?: number
	type?: VMixInputType | string
	name?: string
	filePath?: string
	state?: 'Paused' | 'Running' | 'Completed'
	playing?: boolean
	position?: number
	duration?: number
	loop?: boolean
	muted?: boolean
	volume?: number
	balance?: number
	fade?: number
	solo?: boolean
	audioBuses?: string
	audioAuto?: boolean
	transform?: VMixTransform
	overlays?: VMixInputOverlays
}

export interface VMixOverlay {
	number: number
	input: string | number | undefined
}

export interface VMixAudioChannel {
	volume: number
	muted: boolean
	meterF1: number
	meterF2: number
	headphonesVolume: number
}
