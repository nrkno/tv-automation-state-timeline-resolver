import { Mapping } from './mapping'
import { TSRTimelineObjBase, DeviceType } from '.'

export type MappingVMixAny =
	| MappingVMixProgram
	| MappingVMixPreview
	| MappingVMixInput
	| MappingVMixAudioChannel
	| MappingVMixOutput
	| MappingVMixOverlay
	| MappingVMixRecording
	| MappingVMixStreaming
	| MappingVMixExternal
	| MappingVMixFadeToBlack
	| MappingVMixFader

export interface MappingVMix extends Mapping {
	device: DeviceType.VMIX
	mappingType: MappingVMixType
	deviceId: string
}

export interface MappingVMixProgram extends MappingVMix {
	mappingType: MappingVMixType.Program

	/** Number of the mix (1 is the main mix, 2-4 are optional Mix Inputs) */
	index?: 1 | 2 | 3 | 4
}

export interface MappingVMixPreview extends MappingVMix {
	mappingType: MappingVMixType.Preview // should this have a separate mapping?

	/** Number of the mix (1 is the main mix, 2-4 are optional Mix Inputs) */
	index?: 1 | 2 | 3 | 4
}

export interface MappingVMixInput extends MappingVMix {
	mappingType: MappingVMixType.Input

	/** Input number or name */
	index?: number | string
}

export interface MappingVMixAudioChannel extends MappingVMix {
	mappingType: MappingVMixType.AudioChannel

	/** Input number or name */
	index?: number | string

	/** Input layer name */
	inputLayer?: string
}

export interface MappingVMixOutput extends MappingVMix {
	mappingType: MappingVMixType.Output

	/** Output */
	index: '2' | '3' | '4' | 'External2' | 'Fullscreen' | 'Fullscreen2'
}

export interface MappingVMixOverlay extends MappingVMix {
	mappingType: MappingVMixType.Overlay

	/** Overlay number */
	index: 1 | 2 | 3 | 4
}

export interface MappingVMixRecording extends MappingVMix {
	mappingType: MappingVMixType.Recording
}

export interface MappingVMixStreaming extends MappingVMix {
	mappingType: MappingVMixType.Streaming

	/** Stream number */
	// index: 1 | 2 | 3 // TODO: implement
}

export interface MappingVMixExternal extends MappingVMix {
	mappingType: MappingVMixType.External
}

export interface MappingVMixFadeToBlack extends MappingVMix {
	mappingType: MappingVMixType.FadeToBlack // should this have a separate mapping?
}

export interface MappingVMixFader extends MappingVMix {
	mappingType: MappingVMixType.Fader // should this have a separate mapping?
}

export enum MappingVMixType {
	Program = 0,
	Preview = 1,
	Input = 2, // order of Input and AudioChannel matters because of the way layers are sorted
	AudioChannel = 3,
	Output = 4,
	Overlay = 5,
	Recording = 6,
	Streaming = 7,
	External = 8,
	FadeToBlack = 9,
	Fader = 10,
}

export interface VMixOptions {
	host: string
	port: number
}

export enum VMixCommand {
	PREVIEW_INPUT = 'PREVIEW_INPUT',
	TRANSITION = 'TRANSITION',
	AUDIO_VOLUME = 'AUDIO_VOLUME',
	AUDIO_BALANCE = 'AUDIO_BALANCE',
	AUDIO_ON = 'AUDIO_ON',
	AUDIO_OFF = 'AUDIO_OFF',
	AUDIO_AUTO_ON = 'AUDIO_AUTO_ON',
	AUDIO_AUTO_OFF = 'AUDIO_AUTO_OFF',
	AUDIO_BUS_ON = 'AUDIO_BUS_ON',
	AUDIO_BUS_OFF = 'AUDIO_BUS_OFF',
	FADER = 'FADER',
	SET_PAN_X = 'SET_PAN_X',
	SET_PAN_Y = 'SET_PAN_Y',
	SET_ZOOM = 'SET_ZOOM',
	SET_ALPHA = 'SET_ALPHA',
	START_STREAMING = 'START_STREAMING',
	STOP_STREAMING = 'STOP_STREAMING',
	START_RECORDING = 'START_RECORDING',
	STOP_RECORDING = 'STOP_RECORDING',
	FADE_TO_BLACK = 'FADE_TO_BLACK',
	ADD_INPUT = 'ADD_INPUT',
	REMOVE_INPUT = 'REMOVE_INPUT',
	PLAY_INPUT = 'PLAY_INPUT',
	PAUSE_INPUT = 'PAUSE_INPUT',
	LOOP_ON = 'LOOP_ON',
	LOOP_OFF = 'LOOP_OFF',
	SET_POSITION = 'SET_POSITION',
	SET_INPUT_NAME = 'SET_INPUT_NAME',
	SET_OUPUT = 'SET_OUTPUT',
	START_EXTERNAL = 'START_EXTERNAL',
	STOP_EXTERNAL = 'STOP_EXTERNAL',
	OVERLAY_INPUT_IN = 'OVERLAY_INPUT_IN',
	OVERLAY_INPUT_OUT = 'OVERLAY_INPUT_OUT',
	SET_INPUT_OVERLAY = 'SET_INPUT_OVERLAY',
}

export type TimelineObjVMixAny =
	| TimelineObjVMixProgram
	| TimelineObjVMixPreview
	| TimelineObjVMixAudio
	| TimelineObjVMixFader
	| TimelineObjVMixRecording
	| TimelineObjVMixStreaming
	| TimelineObjVMixExternal
	| TimelineObjVMixFadeToBlack
	| TimelineObjVMixOutput
	| TimelineObjVMixOverlay
	| TimelineObjVMixInput

export enum TimelineContentTypeVMix {
	PROGRAM = 'PROGRAM',
	PREVIEW = 'PREVIEW',
	AUDIO = 'AUDIO',
	FADER = 'FADER',
	STREAMING = 'STREAMING',
	RECORDING = 'RECORDING',
	FADE_TO_BLACK = 'FADE_TO_BLACK',
	INPUT = 'INPUT',
	OUTPUT = 'OUTPUT',
	EXTERNAL = 'EXTERNAL',
	OVERLAY = 'OVERLAY',
}
export interface TimelineObjVMixBase extends TSRTimelineObjBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix
	}
}

export interface TimelineObjVMixProgram extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.PROGRAM

		/** Input number or name */
		input?: number | string

		/** Input layer name */
		inputLayer?: string

		/** Transition effect (Stingers work only for Mix number 1) */
		transition?: VMixTransition
	}
}

export interface TimelineObjVMixPreview extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.PREVIEW

		/** Input number or name */
		input: number | string
	}
}

export interface TimelineObjVMixAudio extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.AUDIO

		/** Channel volume (0 - 100) */
		volume?: number

		/** Volume change fade length in milliseconds */
		fade?: number

		/** Channel balance (-1 - 1) */
		balance?: number

		/** If input is muted */
		muted?: boolean

		/** Comma separated list of busses to enable (M,A,B,C,D,E,F,G) */
		audioBuses?: string

		/** Audio follow video */
		audioAuto?: boolean
	}
}

export interface TimelineObjVMixFader extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.FADER

		/** Position of the transition fader (0 - 255) */
		position: number
	}
}

export interface TimelineObjVMixStreaming extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.STREAMING

		/** If streaming should be turned on */
		on: boolean
	}
}

export interface TimelineObjVMixRecording extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.RECORDING

		/** If recording should be turned on */
		on: boolean
	}
}

export interface TimelineObjVMixFadeToBlack extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.FADE_TO_BLACK

		/** If Fade To Black should be turned on */
		on: boolean
	}
}

export interface TimelineObjVMixInput extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.INPUT

		/** Media file path */
		filePath?: number | string

		/** Set only when dealing with media */
		inputType?: VMixInputType

		/** If media should be playing */
		playing?: boolean

		/** Media starting position in milliseconds */
		seek?: number

		/** If media should loop */
		loop?: boolean

		transform?: VMixTransform

		/** List of input (Multi View) overlays; indexes start from 1 */
		overlays?: VMixInputOverlays
	}
}

export interface TimelineObjVMixOutput extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.OUTPUT

		/** Type of the source sent to output */
		source: 'Preview' | 'Program' | 'MultiView' | 'Input'

		/** Number/name of the input when source:'Input' is chosen */
		input?: number | string
	}
}

export interface TimelineObjVMixExternal extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.EXTERNAL

		/** If external should be turned on */
		on: boolean
	}
}

export interface TimelineObjVMixOverlay extends TimelineObjVMixBase {
	content: {
		deviceType: DeviceType.VMIX
		type: TimelineContentTypeVMix.OVERLAY

		/** Input number or name */
		input: number | string
	}
}

export interface VMixTransform {
	/** Scale (0 - 5) */
	zoom: number

	/** Horizontal pan (-2 - 2) */
	panX: number

	/** Vertical pan (-2 - 2) */
	panY: number

	/** Transparency (0 - 255) */
	alpha: number
}

export interface VMixInputOverlays {
	[index: string]: number | string
}

export interface VMixTransition {
	effect: VMixTransitionType

	/** Duration in milliseconds */
	duration: number
}

export enum VMixTransitionType {
	Cut = 'Cut',
	CutDirect = 'CutDirect',
	Fade = 'Fade',
	Zoom = 'Zoom',
	Wipe = 'Wipe',
	Slide = 'Slide',
	Fly = 'Fly',
	CrossZoom = 'CrossZoom',
	FlyRotate = 'FlyRotate',
	Cube = 'Cube',
	CubeZoom = 'CubeZoom',
	VerticalWipe = 'VerticalWipe',
	VerticalSlide = 'VerticalSlide',
	Merge = 'Merge',
	WipeReverse = 'WipeReverse',
	SlideReverse = 'SlideReverse',
	VerticalWipeReverse = 'VerticalWipeReverse',
	VerticalSlideReverse = 'VerticalSlideReverse',
	Stinger1 = 'Stinger1',
	Stinger2 = 'Stinger2',
}

export enum VMixInputType {
	Video = 'Video',
	Image = 'Image',
	Photos = 'Photos',
	Xaml = 'Xaml',
	AudioFile = 'AudioFile',
	Flash = 'Flash',
	PowerPoint = 'PowerPoint',
}
