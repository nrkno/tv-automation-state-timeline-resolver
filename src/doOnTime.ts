import { EventEmitter } from 'events'
import _ from 'underscore'
import { SlowReportOptions } from './types/src/device'

export type DoOrderFunction = (...args: any[]) => void | Promise<any> | any
export type DoOrderFunctionNothing = () => void | Promise<any> | any
export type DoOrderFunction0<A> = (arg0: A) => void | Promise<any> | any
export type DoOrderFunction1<A, B> = (arg0: A, arg1: B) => void | Promise<any> | any
export type DoOrderFunction2<A, B, C> = (arg0: A, arg1: B, arg2: C) => void | Promise<any> | any

interface DoOrder {
	time: number
	fcn: DoOrderFunction
	args: any[]
	addedTime: number
	prepareTime: number
}

export enum SendMode {
	/** Send messages as quick as possible */
	BURST = 1,
	/** Send messages in order, wait for the previous message to be acknowledged before sending the next */
	IN_ORDER = 2,
}
export type DoOnTimeOptions = SlowReportOptions
export class DoOnTime extends EventEmitter {
	getCurrentTime: () => number
	private _i = 0
	private _queues: {
		[queueId: string]: { [id: string]: DoOrder }
	} = {}

	private _checkQueueTimeout: any = 0
	private _sendMode: SendMode
	private _commandsToSendNow: {
		[queueId: string]: (() => Promise<any>)[]
	} = {}

	private _sendingCommands: {
		[queueId: string]: boolean
	} = {}
	private _options: DoOnTimeOptions

	// Overide EventEmitter.on() for stronger typings:
	on: ((event: 'error', listener: (err: Error) => void) => this) &
		((event: 'slowCommand', listener: (commandInfo: string) => void) => this) &
		((event: 'commandReport', listener: (commandReport: CommandReport) => void) => this)

	// Overide EventEmitter.emit() for stronger typings:
	emit: ((event: 'error', err: Error) => boolean) &
		((event: 'slowCommand', commandInfo: string) => boolean) & // A report that a command was sent too late
		((event: 'commandReport', commandReport: CommandReport) => boolean) // A report of the command sent, emitted after it has been fulfilled

	constructor(getCurrentTime: () => number, sendMode: SendMode = SendMode.BURST, options?: DoOnTimeOptions) {
		super()
		this.on = super.on
		this.emit = super.emit

		this.getCurrentTime = getCurrentTime
		this._sendMode = sendMode
		this._options = options || {}
	}
	public queue(time: number, queueId: string | undefined, fcn: DoOrderFunctionNothing): string
	public queue<A>(time: number, queueId: string | undefined, fcn: DoOrderFunction0<A>, arg0: A): string
	public queue<A, B>(time: number, queueId: string | undefined, fcn: DoOrderFunction1<A, B>, arg0: A, arg1: B): string
	public queue<A, B, C>(
		time: number,
		queueId: string | undefined,
		fcn: DoOrderFunction2<A, B, C>,
		arg0: A,
		arg1: B,
		arg2: C
	): string
	public queue(time: number, queueId: string | undefined, fcn: DoOrderFunction, ...args: any[]): string {
		if (!(time >= 0)) throw Error(`DoOnTime: time argument must be >= 0 (${time})`)
		if (!_.isFunction(fcn)) throw Error(`DoOnTime: fcn argument must be a function! (${typeof fcn})`)
		const id = '_' + this._i++

		if (!queueId) queueId = '_' // default
		if (!this._queues[queueId]) this._queues[queueId] = {}
		this._queues[queueId][id] = {
			time: time,
			fcn: fcn,
			args: args,
			addedTime: this.getCurrentTime(),
			prepareTime: 0,
		}
		this._checkQueueTimeout = setTimeout(() => {
			this._checkQueue()
		}, 0)
		return id
	}
	public getQueue(): Array<{ id: string; queueId: string; time: number; args: any[] }> {
		const fullQueue: Array<{ id: string; queueId: string; time: number; args: any[] }> = []

		_.each(this._queues, (queue, queueId) => {
			_.each(queue, (q, id) => {
				fullQueue.push({
					id: id,
					queueId: queueId,
					time: q.time,
					args: q.args,
				})
			})
		})

		return fullQueue
	}
	public clearQueueAfter(time: number): void {
		_.each(this._queues, (queue, queueId: string) => {
			_.each(queue, (q: DoOrder, id: string) => {
				if (q.time > time) {
					this._remove(queueId, id)
				}
			})
		})
	}
	public clearQueueNowAndAfter(time: number): number {
		let removed = 0
		_.each(this._queues, (queue, queueId: string) => {
			_.each(queue, (q: DoOrder, id: string) => {
				if (q.time >= time) {
					this._remove(queueId, id)
					removed++
				}
			})
		})
		return removed
	}
	dispose(): void {
		this.clearQueueAfter(0) // clear all
		clearTimeout(this._checkQueueTimeout)
	}
	private _remove(queueId: string, id: string) {
		delete this._queues[queueId][id]
	}
	private _checkQueue() {
		clearTimeout(this._checkQueueTimeout)

		const now = this.getCurrentTime()

		let nextTime = now + 99999

		_.each(this._queues, (queue, queueId: string) => {
			_.each(queue, (o: DoOrder, id: string) => {
				if (o.time <= now) {
					o.prepareTime = this.getCurrentTime()
					if (!this._commandsToSendNow[queueId]) this._commandsToSendNow[queueId] = []
					this._commandsToSendNow[queueId].push(() => {
						try {
							const startSend = this.getCurrentTime()
							let sentTooSlow = false
							const p = Promise.resolve(o.fcn(...o.args)).then(() => {
								if (!sentTooSlow) this._verifyFulfillCommand(o, startSend, queueId)

								this._sendCommandReport(o, startSend, queueId)
							})
							sentTooSlow = this._verifySendCommand(o, startSend, queueId)
							return p
						} catch (e) {
							return Promise.reject(e)
						}
					})
					this._remove(queueId, id)
				} else {
					if (o.time < nextTime) nextTime = o.time
				}
			})
			// Go through the commands to be sent:
			this._sendNextCommand(queueId)
		})

		// schedule next check:
		const timeToNext = Math.min(1000, nextTime - now)
		this._checkQueueTimeout = setTimeout(() => {
			this._checkQueue()
		}, timeToNext)
	}
	private _sendNextCommand(queueId: string) {
		if (this._sendingCommands[queueId]) {
			return
		}
		this._sendingCommands[queueId] = true

		try {
			if (!this._commandsToSendNow[queueId]) this._commandsToSendNow[queueId] = []

			const commandToSend = this._commandsToSendNow[queueId].shift()
			if (commandToSend) {
				if (this._sendMode === SendMode.BURST) {
					// send all at once:
					commandToSend().catch((e) => {
						this.emit('error', e)
					})
					this._sendingCommands[queueId] = false
					// send next message:
					setTimeout(() => {
						this._sendNextCommand(queueId)
					}, 0)
				} else {
					// SendMode.IN_ORDER
					// send one, wait for it to finish, then send next:
					commandToSend()
						.catch((e) => {
							this.emit('error', e)
						})
						.then(() => {
							this._sendingCommands[queueId] = false
							// send next message:
							this._sendNextCommand(queueId)
						})
						.catch((e) => {
							this._sendingCommands[queueId] = false
							this.emit('error', e)
						})
				}
			} else {
				this._sendingCommands[queueId] = false
			}
		} catch (e) {
			this._sendingCommands[queueId] = false
			throw e
		}
	}
	private representArguments(o: DoOrder) {
		if (o.args && o.args[0] && o.args[0].serialize && _.isFunction(o.args[0].serialize)) {
			return o.args[0].serialize()
		} else {
			return o.args
		}
	}
	private _verifySendCommand(o: DoOrder, send: number, queueId: string): boolean {
		if (this._options.limitSlowSentCommand) {
			const sendDelay: number = send - o.time
			const addedDelay: number = o.time - o.addedTime
			if (sendDelay > this._options.limitSlowSentCommand) {
				const output = {
					added: o.addedTime,
					prepareTime: o.prepareTime,
					plannedSend: o.time,
					send: send,
					queueId: queueId,
					args: this.representArguments(o),
				}
				this.emit(
					'slowCommand',
					`Slow sent command, should have been sent at ${o.time}, was ${sendDelay} ms slow (was added ${
						addedDelay >= 0 ? `${addedDelay} ms before` : `${-addedDelay} ms after`
					} planned), sendMode: ${SendMode[this._sendMode]}. Command: ${JSON.stringify(output)}`
				)
				return true
			}
		}
		return false
	}
	private _verifyFulfillCommand(o: DoOrder, send: number, queueId: string) {
		if (this._options.limitSlowFulfilledCommand) {
			const fullfilled = this.getCurrentTime()
			const fulfilledDelay: number = fullfilled - o.time
			const output = {
				added: o.addedTime,
				prepareTime: o.prepareTime,
				plannedSend: o.time,
				send: send,
				queueId: queueId,
				fullfilled: fullfilled,
				args: this.representArguments(o),
			}
			if (fulfilledDelay > this._options.limitSlowFulfilledCommand) {
				this.emit(
					'slowCommand',
					`Slow fulfilled command, should have been fulfilled at ${
						o.time
					}, was ${fulfilledDelay} ms slow. Command: ${JSON.stringify(output)}`
				)
			}
		}
	}
	private _sendCommandReport(o: DoOrder, send: number, queueId: string) {
		const fullfilled = this.getCurrentTime()
		if (this.listenerCount('commandReport') > 0) {
			// let sendDelay: number = endSend - o.time
			// let fulfilledDelay: number = fullfilled - o.time

			const output: CommandReport = {
				added: o.addedTime,
				prepareTime: o.prepareTime,
				plannedSend: o.time,
				send: send,
				queueId: queueId,
				fullfilled: fullfilled,
				args: this.representArguments(o),
			}
			this.emit('commandReport', output)
		}
	}
}

export interface CommandReport {
	/** The time the command is planned to execute */
	plannedSend: number
	/** The queue the command is put into */
	queueId: string
	/** Command is added to list of planned (future) events */
	added: number
	/** Command is picked from list of events and put into queue for immediade execution  */
	prepareTime: number
	/** Command is starting to exeute */
	send: number
	/** Command has finished executing */
	fullfilled: number
	/** Arguments of command */
	args: any
}
