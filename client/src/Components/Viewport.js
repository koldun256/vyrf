import React, { useState, useEffect, useRef, useMemo, useContext } from 'react'
import { createUseStyles } from 'react-jss'
import MovableObject from 'Components/MovableObject.js'
import StaticObject from 'Components/StaticObject.js'
import Translator from 'Other/translator.js'
import {SocketContext} from 'Components/App'

const useStyles = createUseStyles({
	viewport: {
		margin: 'auto',
		left: 'auto',
		right: 'auto',
		position: 'absolute',
		border: '1px solid black',
		overflow: 'hidden',
		width: '100vh',
		height: '100vh',
	},
})

const defaultSeeing = [
	{
		type: 'bg',
		id: 'bg',
		position: [3000, 3000],
	},
	//{
		//type: 'target',
		//id: 'target',
		//position: [0, 0],
	//},
]

function Viewport(props) {
	const classes = useStyles(props),
		knownObjects = useRef(new Set(props.startKnowing)),
		translator = useMemo(() => {
			return Translator(document.documentElement.clientHeight, props.size)
		}, []),
		seeingObjects = useRef(new Set()),
		[, rerender] = useState(),
		socket = useContext(SocketContext)

	function see({ id, position, movement }) {
		let knownObject = [...knownObjects.current].find(obj => obj.id == id)
		if (!knownObject) return console.error('seeing unknown object')
		let objectData = {
			__proto__: knownObject,
			position,
			movement
		}
		let addingValue = movement ? (
				<MovableObject
					translator={translator}
					objectData={objectData}
					key={knownObject.id}
				/>
			) : (
				<StaticObject
					translator={translator}
					objectData={objectData}
					key={knownObject.id}
				/>
			)
		seeingObjects.current.add(addingValue)
		rerender({})
	}

	useEffect(() => {
		props.startSeeing.forEach(see)

		socket.on('know', msg => knownObjects.add(msg))
		socket.on('see', msg => see(msg))
	}, [])

	const setTarget = e => {
		let rect = e.target.getBoundingClientRect()
		let viewportPosition = [e.clientX - rect.left, e.clientY - rect.top]
		let globalPosition = translator.localToGlobal(viewportPosition)
		socket.emit('movement target', globalPosition)
		//[...seeingObjects.current].find(
			//object => object.id == 'target'
		//).position = globalPosition
	}
	let children = [...seeingObjects.current]
	return (
		<div className={classes.viewport} onClick={setTarget}>
			{children}
		</div>
	)
}

export default Viewport
