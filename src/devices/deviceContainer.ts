import { ThreadedClass, threadedClass, ThreadedClassConfig, ThreadedClassManager } from 'threadedclass'
import { Device } from './device'
import { DeviceType, DeviceOptionsAny } from '../types/src'

/**
 * A device container is a wrapper around a device in ThreadedClass class, it
 * keeps a local property of some basic information about the device (like
 * names and id's) to prevent a costly round trip over IPC.
 */
export class DeviceContainer {
	public _device: ThreadedClass<Device>
	public _deviceId = 'N/A'
	public _deviceType: DeviceType
	public _deviceName = 'N/A'
	public _deviceOptions: DeviceOptionsAny
	public _threadConfig: ThreadedClassConfig | undefined
	public onChildClose: () => void | undefined
	private _instanceId = -1
	private _startTime = -1
	private _onEventListener: { stop: () => void } | undefined

	async create<T extends Device, TCtor extends new (...args: any) => T>(
		orgModule: string,
		orgClassExport: string,
		deviceId: string,
		deviceOptions: DeviceOptionsAny,
		getCurrentTime: () => number,
		threadConfig?: ThreadedClassConfig
	) {
		this._deviceOptions = deviceOptions
		// this._options = options
		this._threadConfig = threadConfig

		if (process.env.JEST_WORKER_ID !== undefined && threadConfig && threadConfig.disableMultithreading) {
			// running in Jest test environment.
			// hack: we need to work around the mangling performed by threadedClass, as getCurrentTime needs to not return a promise
			getCurrentTime = { inner: getCurrentTime } as any
		}

		this._device = await threadedClass<T, TCtor>(
			orgModule,
			orgClassExport,
			[deviceId, deviceOptions, getCurrentTime] as any, // TODO types
			threadConfig
		)

		if (deviceOptions.isMultiThreaded) {
			this._onEventListener = ThreadedClassManager.onEvent(this._device, 'thread_closed', () => {
				// This is called if a child crashes
				if (this.onChildClose) this.onChildClose()
			})
		}

		await this.reloadProps()

		return this
	}

	public async reloadProps(): Promise<void> {
		this._deviceId = await this.device.deviceId
		this._deviceType = await this.device.deviceType
		this._deviceName = await this.device.deviceName
		this._instanceId = await this.device.instanceId
		this._startTime = await this.device.startTime
	}

	public async terminate() {
		if (this._onEventListener) {
			this._onEventListener.stop()
		}
		await ThreadedClassManager.destroy(this._device)
	}

	public get device(): ThreadedClass<Device> {
		return this._device
	}
	public get deviceId(): string {
		return this._deviceId
	}
	public get deviceType(): DeviceType {
		return this._deviceType
	}
	public get deviceName(): string {
		return this._deviceName
	}
	public get deviceOptions(): DeviceOptionsAny {
		return this._deviceOptions
	}
	public get threadConfig(): ThreadedClassConfig | undefined {
		return this._threadConfig
	}
	public get instanceId(): number {
		return this._instanceId
	}
	public get startTime(): number {
		return this._startTime
	}
}
