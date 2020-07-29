const Team = require("./Team");
const Collider = require("./Collider");
const setting = require("./setting.json");
const util = require("./util");
const Main = require("./Main");
const Movement = require("./Movement");

let rooms = [];
function Room(roomSetting) {
	let update, sync;
	let gameObjects = [];
	let teams = [];
	let players = [];

	this.start = function () {
		console.log("room starting!!");
		players.forEach(player => {
			player.setPosition(player.team.position);
			player.init({
				speed: setting.modes[roomSetting.mode]["player speed"],
				viewport: setting["viewport"],
				size: setting.modes[roomSetting.mode]["player size"],
				startMana: setting["start mana"],
				maxMana: setting["max mana"]
			});
			player.others = players.filter(other => player.id != other.id);

			this.addGameObject({
				object: player,
				type: "player",
				needsMove: true,
				visible: true,
				needsMana: true
			});
		});
		Collider.update();
		players.forEach(
			function (player) {
				let data = {
					me: player.data("room start to me"),
					others: player.others.map(other =>
						other.data("room start to others")
					),
					startSeeing: [...player.seeing].map(object =>
						object.data("see")
					),
					viewport: setting["viewport"],
					movement: Movement.zero().data()
				};
				player.send("room start", data);
			}.bind(this)
		);
		Main.broadcast("room start", this.id);
		update = Main.on("update", this.onFrame);
		sync = Main.on("sync", this.onSync);
		isWaiting = false;
	};

	function autoGetTeam() {
		let result;
		let minimum = Infinity;
		teams.forEach(team => {
			if (team.players().length < minimum) {
				result = team;
				minimum = team.players().length;
			}
		});
		return result;
	}

	this.getGameObjects = function (...args) {
		let result = [];
		if (args.length == 1) {
			gameObjects.forEach(gm => {
				if (args[0] in gm) result.push(gm);
			});
		} else if (args.length == 2) {
			gameObjects.forEach(gm => {
				if (gm[args[0]] == args[1]) result.push(gm);
			});
		} else {
			result = gameObjects;
		}
		return result;
	};

	this.onFrame = function () {
		this.getGameObjects("lifetime").forEach(gm => {
			gm.lifetime--;
			if (gm.lifetime < 0) this.destroy(gm.id);
		});
		this.getGameObjects("needsMove", true).forEach(gm => {
			gm.object.movement.move();
		});
		Collider.update();
	}.bind(this);

	this.onSync = function () {
		this.send("sync", player => player.data("sync"));
	};

	this.end = function (endData) {
		update.end();
		sync.end();
		Main.broadcast("room end", this.id);
		this.send("end", function (player) {
			return this.data("end", endData);
		});
	};

	this.id = util.generateID();

	this.addGameObject = function (gameObject) {
		gameObject.id = util.generateID();
		gameObject.object.room = this;
		gameObjects.push(gameObject);
		if (gameObject.visible)
			gameObject.object.collider.onTouch("viewport", player =>
				player.see(gameObject.object)
			);
		if (gameObject.needsMana)
			gameObject.object.collider.onStay("mana zone", () =>
				gameObject.object.addMana(setting["mana regen"])
			);
	};

	this.send = function (msg, genContent) {
		players.forEach(player => player.send(msg, genContent(player)));
	};

	this.addPlayer = function (player, teamID) {
		let team;
		if (teamID) {
			team = Team.getByID(teamID);
			if (!teams.includes(team)) {
				throw "adding to unexistent team";
			}
		} else {
			team = autoGetTeam();
		}
		team.add(player);
		players.push(player);
		this.send("adding to waiting", () => player.data("connect to waiting"));

		let allTeamsFilled = true;
		teams.forEach(team => {
			if (!team.full()) allTeamsFilled = false;
		});
		if (allTeamsFilled) setTimeout(this.start.bind(this), 1000);
		// добавление игрового объекта - в room start
	};

	this.data = function (situation, params) {
		switch (situation) {
			case "end":
				return {
					winner: params.winner.id
				};
				break;
			case "connect":
				let data = {
					waiting: players.map(player =>
						player.data("connect to waiting")
					),
					id: this.id
				};
				return data;
		}
	};

	this.isWaiting = true;

	setting.modes[roomSetting.mode]["bases positions"].forEach(
		(basePosition => {
			//генерация баз и команд
			let baseObject = {
				position: basePosition,
				room: this,
				id: util.generateID()
			};
			(baseObject.data = () => ({
				type: "base",
				position: basePosition,
				id: baseObject.id,
				type: "base"
			})),
				(baseObject.collider = new Collider(
					baseObject,
					setting.modes[roomSetting.mode]["base size"],
					"base"
				));
			this.addGameObject({
				object: baseObject,
				type: "base",
				needsMove: false,
				visible: true,
				needsMana: false
			});
			teams.push(
				new Team(
					{
						basePosition,
						playersCount:
							setting.modes[roomSetting.mode]["players in team"],
						pointToWin:
							setting.modes[roomSetting.mode]["needsPointsToWin"],
						baseSize: setting.modes[roomSetting.mode]["base size"]
					},
					this
				)
			);
		}).bind(this)
	);

	Collider.generateManaZones(
		setting.modes[roomSetting.mode]["bases positions"],
		setting["mana zone distance"],
		setting["mana zone width"],
		this
	);
	rooms.push(this);
}
new Room({ mode: "DM" });
Room.getRooms = () => [...rooms];
Room.getRoomByID = id => {
	for (let room of rooms) if (room.id == id) return room;
};
Room.random = () => rooms[Math.floor(Math.random() * rooms.length)];
module.exports = Room;
