import { EventEmitter } from 'events'
import { EmberValue } from '../types/src/lawo'
import * as mockData from './lawo-out.json'

export class Node {
	node: any

	constructor(_path: string) {
		this.node = mockData.elements[0]
		const path = _path.split('.')
		path.shift()

		while (path.length > 0) {
			const index = path.shift()
			for (const node of this.node.children as Array<any>) {
				if (node.number === index || node.contents.identifier === index) {
					this.node = node
				}
			}
		}
	}

	getChildren() {
		return this.node.children as Array<any>
	}

	get contents() {
		return this.node.contents
	}
}

export class DeviceTree extends EventEmitter {
	connect() {
		return new Promise((resolve) => resolve())
	}

	isConnected() {
		return true
	}

	getNodeByPath(path: string) {
		// console.log('get node', path)
		return new Promise((resolve) => resolve(new Node(path)))
	}

	setValue(node: Node, value: EmberValue) {
		node.node.contents.value = value
		console.log(node.node.contents.value, value)
		return new Promise((resolve) => resolve())
	}
}
