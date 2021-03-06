import Collider from '../Collider.mjs'

export default {
	name: 'basic collider',
	requires: [],
	init(payload, shape) {
		console.log(shape);
		this.collider = new Collider(
			this,
			payload,
			shape,
			this.type,
			this.room.collisionSystem
		)
	},
}
