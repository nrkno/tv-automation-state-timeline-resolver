import {
	DeviceType,
	AtemOptions,
	CasparCGOptions,
	HTTPSendOptions,
	HyperdeckOptions,
	OSCOptions,
	PharosOptions,
	QuantelOptions,
	SingularLiveOptions,
	SisyfosOptions,
	TCPSendOptions,
	AbstractOptions,
	LawoOptions,
	PanasonicPTZOptions,
	HTTPWatcherOptions,
	VizMSEOptions,
	VMixOptions
} from '.'
import { ShotokuOptions } from './shotoku'
import { SonyMVSOptions } from './sonyMVS'

export interface DeviceOptionsBase extends SlowReportOptions {
	type: DeviceType
	isMultiThreaded?: boolean
	reportAllCommands?: boolean
	threadUsage?: number
	disable?: boolean
	options?: DeviceInitOptions
}

export interface SlowReportOptions {
	/** If set, report back that a command was slow if not sent at this time */
	limitSlowSentCommand?: number
	/** If set, report back that a command was slow if not fullfilled (sent + ack:ed) at this time */
	limitSlowFulfilledCommand?: number
}

export type DeviceOptionsAny = DeviceOptionsAbstract |
	DeviceOptionsCasparCG |
	DeviceOptionsAtem |
	DeviceOptionsLawo |
	DeviceOptionsHTTPSend |
	DeviceOptionsPanasonicPTZ |
	DeviceOptionsTCPSend |
	DeviceOptionsHyperdeck |
	DeviceOptionsPharos |
	DeviceOptionsOSC |
	DeviceOptionsHTTPpWatcher |
	DeviceOptionsSisyfos |
	DeviceOptionsQuantel |
	DeviceOptionsSingularLive |
	DeviceOptionsVMix |
	DeviceOptionsVizMSE |
	DeviceOptionsSingularLive |
	DeviceOptionsShotoku |
	DeviceOptionsSonyMVS

export type DeviceInitOptions = AbstractOptions |
	CasparCGOptions |
	AtemOptions |
	LawoOptions |
	HTTPSendOptions |
	PanasonicPTZOptions |
	TCPSendOptions |
	HyperdeckOptions |
	PharosOptions |
	OSCOptions |
	HTTPWatcherOptions |
	SisyfosOptions |
	QuantelOptions |
	SingularLiveOptions |
	VMixOptions |
	VizMSEOptions |
	SingularLiveOptions

export interface DeviceOptionsAbstract extends DeviceOptionsBase {
	type: DeviceType.ABSTRACT
	options: AbstractOptions
}
export interface DeviceOptionsCasparCG extends DeviceOptionsBase {
	type: DeviceType.CASPARCG
	options: CasparCGOptions
}
export interface DeviceOptionsAtem extends DeviceOptionsBase {
	type: DeviceType.ATEM
	options: AtemOptions
}
export interface DeviceOptionsLawo extends DeviceOptionsBase {
	type: DeviceType.LAWO
	options: LawoOptions
}
export interface DeviceOptionsHTTPSend extends DeviceOptionsBase {
	type: DeviceType.HTTPSEND
	options: HTTPSendOptions
}
export interface DeviceOptionsPanasonicPTZ extends DeviceOptionsBase {
	type: DeviceType.PANASONIC_PTZ
	options: PanasonicPTZOptions
}
export interface DeviceOptionsTCPSend extends DeviceOptionsBase {
	type: DeviceType.TCPSEND
	options: TCPSendOptions
}
export interface DeviceOptionsHyperdeck extends DeviceOptionsBase {
	type: DeviceType.HYPERDECK
	options: HyperdeckOptions
}
export interface DeviceOptionsPharos extends DeviceOptionsBase {
	type: DeviceType.PHAROS
	options: PharosOptions
}
export interface DeviceOptionsOSC extends DeviceOptionsBase {
	type: DeviceType.OSC
	options: OSCOptions
}
export interface DeviceOptionsHTTPpWatcher extends DeviceOptionsBase {
	type: DeviceType.HTTPWATCHER
	options: HTTPWatcherOptions
}
export interface DeviceOptionsSisyfos extends DeviceOptionsBase {
	type: DeviceType.SISYFOS
	options: SisyfosOptions
}
export interface DeviceOptionsQuantel extends DeviceOptionsBase {
	type: DeviceType.QUANTEL
	options: QuantelOptions
}
export interface DeviceOptionsVizMSE extends DeviceOptionsBase {
	type: DeviceType.VIZMSE
	options: VizMSEOptions
}
export interface DeviceOptionsSingularLive extends DeviceOptionsBase {
	type: DeviceType.SINGULAR_LIVE
	options: SingularLiveOptions
}
export interface DeviceOptionsShotoku extends DeviceOptionsBase {
	type: DeviceType.SHOTOKU
	options: ShotokuOptions
}
export interface DeviceOptionsSonyMVS extends DeviceOptionsBase {
	type: DeviceType.SONYMVS
	options: SonyMVSOptions
}

export interface DeviceOptionsVMix extends DeviceOptionsBase {
	type: DeviceType.VMIX
	options: VMixOptions
}
