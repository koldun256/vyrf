import Team from './Team.mjs'
import setting from './config.mjs'
import * as util from './util.mjs'
import * as Main from './Main.mjs'
import EventSystem from './EventSystem.mjs'
import CollisionSystem from './CollisionSystem.mjs'
class Room {
	constructor(mode) {
		this.gameObjects = []
		this.teams = []
		this.players = []
		this.settings = setting.add(setting.modes[mode])
		this.eventSystem = new EventSystem(Main.eventSystem)
		this.collisionSystem = new CollisionSystem()
		this.id = util.generateID()

		//генерация баз и команд
		this.settings['bases positions'].forEach(basePosition => {
			let newTeam = new Team(this, basePosition)
			this.teams.push(newTeam)
		})
	}

	getTeam(teamID) {
		if (teamID) {
			return this.teams.find(team => team.id == teamID)
		} else {
			let team = this.teams.most(team => -team.players.length)
			return team
		}
	}

	start() {
		this.collisionSystem.update()
		this.players.forEach(protagonist => {
			protagonist.send('room start', {
				seeing: [...protagonist.seeing].map(object =>
					object.seeData()
				).concat([protagonist.seeData(true)]),
			})
		})
		Main.eventSystem.emit('room start', this.id)
		Main.eventSystem.on('update', () => this.onFrame())
		Main.eventSystem.on('sync', () => this.onSync())
	}

	onFrame() {
		this.gameObjects
			.filter(gm => 'lifetime' in gm)
			.forEach(gm => {
				gm.lifetime--
				if (!gm.lifetime)
					this.gameObjects.splice(this.gameObjects.indexOf(gm), 1)
			})
		this.collisionSystem.update()
	}

	onSync() {
		this.send('sync', player => player.data('sync'))
	}

	end(endData) {
		Main.broadcast('room end', this.id)
		this.send('end', () => this.data('end', endData))
	}

	send(msg, genContent) {
		this.players.forEach(player => player.send(msg, genContent(player)))
	}

	addPlayer(user, name, spellsData, teamID) {
		let team = this.getTeam(teamID)
		let player = user.createPlayer(name, this, team, spellsData)
		this.send('adding to waiting', () => player.connectingData())
		this.players.push(player)
		player.send('response room enter', this.data('connect'))

		if (!this.teams.some(team => !team.full()))
			setTimeout(() => this.start(), 1000)
	}

	data(situation, params) {
		switch (situation) {
			case 'end':
				return {
					winner: params.winner.id,
				}
			case 'connect':
				return {
					waiting: this.players.map(player =>
						player.connectingData()
					),
					id: this.id,
				}
		}
	}

	registrate(object){
		this.gameObjects.push(object)
	}
}

export default Room
