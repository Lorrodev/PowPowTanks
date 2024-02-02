// Dependencies
var express = require('express');
var https = require('https');
//var http = require('http');
var path = require('path');
var socketIO = require('socket.io');
var fs = require('fs');


var options = {
  key: fs.readFileSync('/etc/letsencrypt/live/indice.games/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/indice.games/fullchain.pem')
};

var app = express();
var server = https.Server(options, app);
//var server = http.Server(app);
var io = socketIO(server);


app.set('port', 5000);
app.use('/static', express.static(__dirname + '/static'));

// Routing
app.get('/', function(request, response) {
  response.sendFile(path.join(__dirname, 'index.html'));
});

// Starts the server.
server.listen(5000, function() {
  console.log('Starting server on port 5000');
});

// Add the WebSocket handlers
io.on('connection', function(socket) {

	socket.on('clientInput', function(id, input) {
		//console.log("Client "+socket.id+" => input '"+input+"' on id '"+id+"' recieved");
		//console.log("accessing room "+id);
		//try{
		  	if(rooms[id] != null && rooms[id].numPlayers >= 2 && socket.id == rooms[id].players[rooms[id].activePlayer-1].socketId){
			    switch(input){
			    	case "fire":
			    	fire(id);
			    	break;

			    	case "increaseAngle":
			    	changeAngle(id, 1);
					break;

					case "decreaseAngle":
					changeAngle(id, -1);
					break;

					case "increasePower":
					changePower(id, 1);
					break;

					case "decreasePower":
					changePower(id, -1);
					break;

			    	case "moveLeft":
			    	moveTank(id, "l");
			    	break;

			    	case "moveRight":
			    	moveTank(id, "r");
			    	break;
			    }
			}
		//}catch(err){
			//console.log("Error on clientInput: "+err);
		//}

	});

	socket.on('newPlayer', function(level,nick){
		var id = generateRoomId();

  		socket.join(id);
		roomSetup(id, socket, level, nick);

		socket.emit('roomId',id);
		io.to(rooms[id].rid).emit('numPlayers',rooms[id].numPlayers);

		try{
			var text = "<span><i>"+rooms[id].players[rooms[id].players.length-1].name+" joined the room</i></span>";
			io.to(id).emit('newMessage', text);
		}catch(err){
			console.log(err);
		}

		io.to(id).emit('levelChanged',rooms[id].level);
	});

	socket.on('changeRoom', function(lastId, newId, nick){
		if(rooms[newId] != null && rooms[newId].numPlayers < 4){
			if(rooms[lastId] != null){
				rooms[lastId].numPlayers--;
			}
			socket.leave(lastId);
	  		socket.join(newId);
			roomSetup(newId, socket, 0, nick);

			io.to(rooms[newId].rid).emit('numPlayers',rooms[newId].numPlayers);

			try{
				var text = "<span><i>"+rooms[newId].players[rooms[newId].numPlayers-1].name+" joined the room</i></span>";
				io.to(newId).emit('newMessage', text);
			}catch(err){
				console.log(err);
			}

			io.to(newId).emit('levelChanged',rooms[newId].level);
		}else{
			socket.emit("roomNotExisting");
		}
	});

	socket.on('leaveRoom', function(roomId, player){
		if(roomId != "Welcome" && rooms[roomId] != null){

			if(rooms[roomId].activePlayer == player && rooms[roomId].numPlayers > 1){
				nextPlayer(roomId);
			}

			io.to(roomId).emit('numPlayers',(rooms[roomId].numPlayers-1));

			try{
				if(rooms[roomId].players[player-1]!=null){
					var text = "<span><i>"+rooms[roomId].players[player-1].name+" left the room</i></span>";
					io.to(roomId).emit('newMessage', text);
				}
			}catch(err){
				console.log(err);
			}

			leaveRoom(roomId, player);

			for(var i = 0; i < rooms[roomId].numPlayers; i++){
				io.to(rooms[roomId].players[i].socketId).emit('playerNum', (i+1));
			}

			if(rooms[roomId].numPlayers == 0){
				resetRoom(roomId);
			}
		}
	});

	socket.on('changeMap', function(roomId, lvl, player){
		try{
			var text = "<span><i>"+rooms[roomId].players[player-1].name+" changed the Map</i></span>";
			io.to(roomId).emit('newMessage', text);
		}catch(err){
			console.log(err);
		}

		io.to(roomId).emit('levelChanged',lvl);

		rooms[roomId].level = lvl;

		if(!rooms[roomId].activeGame){
			init(roomId, lvl);
		}
	});

	socket.on('sendMessage', function(roomId, message, player){
		try{
			var color = "#ffbb00";
			var name = "Spectator";

			if(rooms[roomId].tanks[player-1] != null){
				color = rooms[roomId].tanks[player-1].color;
				name = rooms[roomId].players[player-1].name;
			}

			var text = "<span><span style='color: "+color+";'>"+name+": </span>"+message+"</span>";
			io.to(roomId).emit('newMessage', text);
		}catch(err){
			console.log(err);
		}
	});

	socket.on('reset', function(id){
		resetRoom(id);
	});
});

//var setup
var rooms = [];
var cleaned = true;

var rids = [];

var groundHeight = 130;

var width = 800;
var height = 500;

var gravity = 10;
var speed = 2; //tank movement

var blue = "#4f53ee";
var red = "#ee4f4f";
var green = "#4fee6f";
var purple = "#c14fee";
var yellow = "#ffdd00";

var tankColors = [blue,red,green,purple];

//startPositions[2player/3player/4player][...]
var startPositions = [
	Math.round(width/10),
	width-(Math.round(width/10)),
	width-(Math.round(width/3)),
	Math.round(width/3)
];

setInterval(function(){
	if(rids.length > 0){
		for(var i = 0; i < rids.length; i++){
			if(rids[i] != null && rooms[rids[i]] != null && rooms[rids[i]].numPlayers > 0 && rooms[rids[i]].activeShot == false){
				var data = [rooms[rids[i]].tanks, rooms[rids[i]].activePlayer, rooms[rids[i]].ground];
				io.to(rids[i]).emit('state', data);
			}
		}
	}
}, 1000 / 20);


setInterval(cleaner, 1800000);


function generateRoomId(){
	var id = Math.round(Math.random()*999999);

	if(rooms[id] == null){
		return id;
	}else{
		generateRoomId();
	}
}


function roomSetup(id, socket, lvl, nick){
	if(rooms[id] == null){
		rids.push(id);

		var tank1 = {
			currentX: -30,
			currentY: 0,
			rotation: 0,
			name: "P1",

			power: 0,
			angle: 0,
			health: 0,
			fuel: 0,
			color: blue
		}

		var tank2 = {
			currentX: -30,
			currentY: 0,
			rotation: 0,
			name: "P2",

			power: 0,
			angle: 0,
			health: 0,
			fuel: 0,
			color: red
		}

		var tank3 = {
			currentX: -30,
			currentY: 0,
			rotation: 0,
			name: "P3",

			power: 0,
			angle: 0,
			health: 0,
			fuel: 0,
			color: green
		}

		var tank4 = {
			currentX: -30,
			currentY: 0,
			rotation: 0,
			name: "P4",

			power: 0,
			angle: 0,
			health: 0,
			fuel: 0,
			color: purple
		}

		rooms[id] = {
			rid: id,
			ground: [],

			tanks: [tank1,tank2,tank3,tank4],

			activeGame: false,
			activePlayer: 1,
			numPlayers: 0,
			chat: [],

			level: lvl,

			players: [],
			winner: 0,

			activeShot: false,

			get activeTank(){
				return this.tanks[this.activePlayer-1];
			}
		};

		if(nick == ""){
			nick = "Guest";
		}

		console.log("Created room on id "+rooms[id].rid);

		rooms[id].players[rooms[id].numPlayers] = {
				connected: true,
				socketId: socket.id,
				name: nick
			};

		console.log("Player "+nick+" on Socket "+rooms[id].players[rooms[id].numPlayers].socketId+" joined room "+id);
		rooms[id].numPlayers++;
		socket.emit('playerNum',rooms[id].numPlayers);
	}else{
		if(rooms[id].numPlayers < 4){

			if(nick == ""){
				nick = "Guest";
			}

			rooms[id].players[rooms[id].numPlayers] = {
				connected: true,
				socketId: socket.id,
				name: nick
			};

			rooms[id].numPlayers++;
			socket.emit('playerNum',rooms[id].numPlayers);

			if(rooms[id].numPlayers >= 2 && !rooms[id].activeGame){
				init(id, rooms[id].level);
			}
	  	}
	}
}

function leaveRoom(roomId, player){
	console.log("Player "+rooms[roomId].players[player-1].name+" left room "+roomId+" => "+(rooms[roomId].numPlayers-1)+" Players remaining");
	
	if(rooms[roomId].numPlayers > 0){
		remapTanksOnLeave(roomId, player);	
	}

	rooms[roomId].numPlayers--;
	rooms[roomId].activePlayer = Math.floor(Math.random()*rooms[roomId].numPlayers)+1;
	rooms[roomId].players.splice((player-1),1);
}

function resetRoom(id){
	rooms[id] = null;

	console.log("Reset room "+id);
}


function cleaner(){
	var count = 0;
	var hour = new Date().getHours();

	if(hour == 4 && !cleaned){
		for(var i = 0; i < rids.length; i++){
			rooms[rids[i]] = null;
			rids[i] = null;
			count++;
		}
		cleaned = true;
		console.log("Cleaned "+count+" Roooms");
	}else if(hour == 5 && cleaned){
		cleaned = false;
		console.log("There's a mess again..");
	}
}

function init(id, stage){
	console.log("Init for "+rooms[id].numPlayers+" Players in Room "+id);
	makeGround(id, stage);

	rooms[id].activePlayer = Math.floor(Math.random()*rooms[id].numPlayers)+1;
	rooms[id].activeTank = rooms[id].tanks[rooms[id].activePlayer-1];
	rooms[id].locked = false;

	resetTanks(id);

	io.to(rooms[id].rid).emit('state', [rooms[id].tanks,rooms[id].activePlayer,rooms[id].ground]);
}



function resetTanks(id){
	for(var i = 0; i < 4; i++){
			rooms[id].tanks[i].currentX = -30;
			rooms[id].tanks[i].currentY = 0;
			rooms[id].tanks[i].rotation = 0;
			rooms[id].tanks[i].name = "";

			rooms[id].tanks[i].power = 0;
			rooms[id].tanks[i].angle = 0;
			rooms[id].tanks[i].health = 0;
			rooms[id].tanks[i].fuel = 0;
			rooms[id].tanks[i].color = tankColors[i];
	}

	//Start positions
	var playerStartPositions = [9,9,9,9];
	var startPositionsSet = false;
	var count = 0;

	while(!startPositionsSet){
		var rand = Math.floor(Math.random()*4);
		var taken = false;

		for(var i = 0; i < 4; i++){
			if(playerStartPositions[i] == rand){
				taken = true;
			}
		}

		if(!taken){
			playerStartPositions[count] = rand;
			count++;
			startPositionsSet = true;
		}

		for(var i = 0; i < 4; i++){
			if(playerStartPositions[i] == 9){
				startPositionsSet = false;
			}
		}
	}

	//end startpositions

	for(var i = 0; i < rooms[id].numPlayers; i++){

		switch(i){
			case 0:
			//rooms[id].tanks[i].currentX = Math.round(width/10);
			rooms[id].tanks[i].currentX = startPositions[playerStartPositions[0]];
			rooms[id].tanks[i].name = rooms[id].players[i].name;
			break;

			case 1:
			//rooms[id].tanks[i].currentX = width-Math.round(width/10);
			rooms[id].tanks[i].currentX = startPositions[playerStartPositions[1]];
			rooms[id].tanks[i].name = rooms[id].players[i].name;
			break;

			case 2:
			//rooms[id].tanks[i].currentX = width-(Math.round(width/3));
			rooms[id].tanks[i].currentX = startPositions[playerStartPositions[2]];
			rooms[id].tanks[i].name = rooms[id].players[i].name;
			break;

			case 3:
			//rooms[id].tanks[i].currentX =  Math.round(width/3);
			rooms[id].tanks[i].currentX = startPositions[playerStartPositions[3]];
			rooms[id].tanks[i].name = rooms[id].players[i].name;
			break;
		}

		rooms[id].tanks[i].angle = 90;
		rooms[id].tanks[i].power = 50;
		rooms[id].tanks[i].health = 100;
		rooms[id].tanks[i].fuel = 100;
	}

	reassignYValules(id);
}

function remapTanksOnLeave(roomId, playerLeftNum){
	for(var i = playerLeftNum; i < rooms[roomId].numPlayers; i++){
		rooms[roomId].tanks[i-1].currentX = rooms[roomId].tanks[i].currentX;
		rooms[roomId].tanks[i-1].currentY = rooms[roomId].tanks[i].currentY;
		rooms[roomId].tanks[i-1].rotation = rooms[roomId].tanks[i].rotation;
		rooms[roomId].tanks[i-1].name = rooms[roomId].tanks[i].name;

		rooms[roomId].tanks[i-1].power = rooms[roomId].tanks[i].power;
		rooms[roomId].tanks[i-1].angle = rooms[roomId].tanks[i].angle;
		rooms[roomId].tanks[i-1].health = rooms[roomId].tanks[i].health;
		rooms[roomId].tanks[i-1].fuel = rooms[roomId].tanks[i].fuel;
	}

	//last tank will be empty
	rooms[roomId].tanks[rooms[roomId].numPlayers-1].currentX = -30;
	rooms[roomId].tanks[rooms[roomId].numPlayers-1].currentY = 0;
	rooms[roomId].tanks[rooms[roomId].numPlayers-1].rotation = 0;
	rooms[roomId].tanks[rooms[roomId].numPlayers-1].name = "-";
	rooms[roomId].tanks[rooms[roomId].numPlayers-1].power = 0;
	rooms[roomId].tanks[rooms[roomId].numPlayers-1].angle = 0;
	rooms[roomId].tanks[rooms[roomId].numPlayers-1].health = 0;
	rooms[roomId].tanks[rooms[roomId].numPlayers-1].fuel = 0;
}


function nextPlayer(id){
	if (checkWin(id)){
		//io.to(rooms[id].rid).emit('win',(rooms[id].players[rooms[id].winner].name));

		var text = "<span><span style='color: "+rooms[id].tanks[rooms[id].winner].color+"'><b>"+rooms[id].players[rooms[id].winner].name+" has won!</b></span></span>";
		io.to(id).emit('newMessage', text);

		init(id, rooms[id].level);
	}else{

		var lastPlayer = rooms[id].activePlayer;

		if(rooms[id].activePlayer < rooms[id].numPlayers){
			rooms[id].activePlayer++;
		}else{
			rooms[id].activePlayer = 1;
		}

		rooms[id].activeTank = rooms[id].tanks[rooms[id].activePlayer-1];

		if(!(rooms[id].activeTank.health > 0)){
			nextPlayer(id);
		}

		rooms[id].locked = false;
		rooms[id].activeTank.fuel = 100;
	}
}

function checkWin(id){
	var killCount = 0;
	for(var i = 0; i < rooms[id].numPlayers; i++){
		if(rooms[id].tanks[i].health <= 0){
			killCount++;
		}else{
			rooms[id].winner = i;
		}
	}

	if(killCount == (rooms[id].numPlayers-1)){
		rooms[id].activeGame = false;
		return true;
	}else{
		return false;
	}
}

function moveTank(id, s){
	if(rooms[id].activeTank.fuel > 0 && !rooms[id].locked){
		switch(s){
			case "r":
			if (rooms[id].activeTank.currentX < 784 && ((height-rooms[id].ground[rooms[id].activeTank.currentX+2])-rooms[id].activeTank.currentY)>-2) {
				rooms[id].activeTank.currentX+=speed;
				rooms[id].activeTank.fuel-=2;
				reassignYValules(id);
			}
			break;

			case "l":
			if (rooms[id].activeTank.currentX > 16 && ((height-rooms[id].ground[rooms[id].activeTank.currentX-2])-rooms[id].activeTank.currentY)>-2) {
				rooms[id].activeTank.currentX-=speed;
				rooms[id].activeTank.fuel-=2;
				reassignYValules(id);
			}
			break;
		}
	}
}

function changePower(id, value){
	if(rooms[id].activeTank.power+value <= 100 && rooms[id].activeTank.power+value >= 20 && !rooms[id].locked){
		rooms[id].activeTank.power+=value;
	}
}

function changeAngle(id, value){
	if(rooms[id].activeTank.angle+value >= 0 && rooms[id].activeTank.angle+value <= 180 && !rooms[id].locked){
		rooms[id].activeTank.angle+=value;
	}
}

function makeGround(id, s){
	switch(s){

	//flat
	case 0:
	for (var i = 0; i < width; i++) {
		rooms[id].ground[i] = groundHeight;
	}
	break;

	//Sin
	case 1:
	for (var i = 0; i < width; i++) {
		rooms[id].ground[i] = Math.sin(i/30)*20+groundHeight;
	}
	break;

	//castle
	case 2:
	for (var i = 0; i < width; i++) {
		if(i > 133-10 && i < 133+10){
			rooms[id].ground[i] = groundHeight+70;
		}else if(i > 133*3-10 && i < 133*3+10){
			rooms[id].ground[i] = groundHeight+70;
		}else if(i > 133*5-10 && i < 133*5+10){
			rooms[id].ground[i] = groundHeight+70;
		}else{
			rooms[id].ground[i] = groundHeight;
		}
	}
	break;

	//valley
	case 3:
	for (var i = 0; i < width; i++) {
		if((i > width/2-300 && i < width/2-70) || (i > width/2+70 && i < width/2+300)){
			rooms[id].ground[i] = 30;
		}else{
			rooms[id].ground[i] = groundHeight;
		}
	}
	break;

	//slope /
	case 4:
		for(var i = 0; i < width; i++){
			rooms[id].ground[i] = (i/3)+50;
		}
	break;

	//slope \
	case 5:
		for(var i = 0; i < width; i++){
			rooms[id].ground[i] = ((width-i)/3)+50; 
		}
	break;

	//hill
	case 6:
		for(var i = 0; i < width; i++){
			rooms[id].ground[i] = Math.sin(i/250)*200+groundHeight; 
		}
	break;

	//bump
	case 7:
		for(var i = 0; i < width; i++){
			rooms[id].ground[i] = -Math.sin(i/250)*200+groundHeight+130; 
		}
	break;

	//random
	case 8:
		makeGround(id, Math.round(Math.random()*7));
	break;
	}
}


function smoothGround(id){
	var onLevel = false;

	for(var i = 2; i < rooms[id].ground.length-2; i++){
		onLevel = false;

		if((rooms[id].ground[i] - rooms[id].ground[i-2]) > -1 && (rooms[id].ground[i] - rooms[id].ground[i+2]) < 1){
			onLevel = true;
		}

		if(!onLevel && i > 0+5 && i < width-5){
			if(Math.abs(rooms[id].ground[i] - rooms[id].ground[i-1]) == 0){
				rooms[id].ground[i] = rooms[id].ground[i-1];
			}else if(Math.abs(rooms[id].ground[i] - rooms[id].ground[i+1]) == 0){
				rooms[id].ground[i] = rooms[id].ground[i+1];
			}else{
				rooms[id].ground[i] = (rooms[id].ground[i-1]+rooms[id].ground[i+1])/2;
			}
		}
	}
}

function reassignYValules(id){
	for(var i = 0; i < rooms[id].numPlayers; i++){
		rooms[id].tanks[i].currentY = height-rooms[id].ground[rooms[id].tanks[i].currentX];
		rooms[id].tanks[i].rotation = Math.atan((rooms[id].ground[rooms[id].tanks[i].currentX-1] - rooms[id].ground[rooms[id].tanks[i].currentX+1])/2)*180/Math.PI;
	}	
}

function fire(id){
	if(!rooms[id].locked){
		rooms[id].locked = true;
		rooms[id].activeGame = true;

		var velocityX = Math.cos((rooms[id].activeTank.angle-rooms[id].activeTank.rotation)* Math.PI / 180)*rooms[id].activeTank.power;
		var velocityY = -Math.sin((rooms[id].activeTank.angle-rooms[id].activeTank.rotation)* Math.PI / 180)*rooms[id].activeTank.power;

		var shotX = rooms[id].activeTank.currentX;
		var shotY = rooms[id].activeTank.currentY-12;

		var tail = [];

		rooms[id].activeShot = true;

		io.to(rooms[id].rid).emit('fire', [shotX, shotY, velocityX, velocityY, tail, 0]);

		getNextPointOnPath(id, shotX, shotY, velocityX, velocityY, tail, 0);
	}
}

function getNextPointOnPath(id, shotX, shotY, velocityX, velocityY, tail, count){
	if(shotY <= height-rooms[id].ground[Math.round(shotX)]){
		if(!checkTankHit(id, shotX, shotY)){
			shotX += velocityX/10; //higher precision by dividing by 10
			shotY += velocityY/10;

			//START of tail part
			if(tail.length == 20){
				tail.shift();
			}

			tail.push([shotX,shotY]);
			//END of tail part

			count++;

			velocityY += gravity/10;

			if((count%4) == 0){
				io.to(rooms[id].rid).emit('fire', [shotX, shotY, velocityX, velocityY, tail]);
			}

			setTimeout(getNextPointOnPath, 10, id, shotX, shotY, velocityX, velocityY, tail, count);
		}else{
			hitScan(id, Math.round(shotX), Math.round(shotY), 40);
			io.to(id).emit('impact',shotX);
			io.to(rooms[id].rid).emit('stopFire');
			rooms[id].activeShot = false;
		}
	}else if(shotX > 0 && shotX < width){
		hitScan(id, Math.round(shotX), Math.round(shotY), 40);
		io.to(id).emit('impact',shotX);
		io.to(rooms[id].rid).emit('stopFire');
		rooms[id].activeShot = false;
	}else{
		setTimeout(nextPlayer, 500, id);
		io.to(rooms[id].rid).emit('stopFire');
		rooms[id].activeShot = false;
	}
}

function checkTankHit(id, shotX, shotY){
	var directHit = false;

	if((shotX < rooms[id].activeTank.currentX-11) || (shotX > rooms[id].activeTank.currentX+11)){
		for(var i = 0; i < rooms[id].numPlayers; i++){
			//check if shot is on o x of tank
			if(shotX > rooms[id].tanks[i].currentX-10 && shotX < rooms[id].tanks[i].currentX+10){
				//check if shot is on y of tank		
				if(shotY > rooms[id].tanks[i].currentY-25 && shotY < rooms[id].tanks[i].currentY+2){
					directHit = true;
				}
			}
		}
	}
	return directHit;
}

function hitScan(id,x,y,r){
	var groundLeft = [];
	var groundRight = [];
	var groundInsert = [];

	//------START of destruction part------
	//x noch im feld?
	if(x-r < 0){
		x = r;
	}

	for(var i = 0; i < (x-r); i++){
		groundLeft[i] = rooms[id].ground[i];
	}

	var index = 0;
	for(var i = (x+r); i < rooms[id].ground.length; i++){
		groundRight[index] = rooms[id].ground[i];
		index++;
	}


	//x nicht eine wand?
	if(rooms[id].ground[x] - rooms[id].ground[x-1] < 5 && rooms[id].ground[x] - rooms[id].ground[x+1] < 5){
		index = 0;
		for(var i = -r; i < r; i++){

				//y bei x+i noch im radius?
				if(rooms[id].ground[x+i] >= rooms[id].ground[x]-r-3 && rooms[id].ground[x+i] <= rooms[id].ground[x]+r+3){

					//y - radius bei x+i noch grösser gleich 0?
					if(rooms[id].ground[x+i]-Math.abs(Math.sin(index/(r/(Math.PI/2)))*r/2) >= 0){
						groundInsert[index] = rooms[id].ground[x+i]-Math.abs(Math.sin(index/(r/(Math.PI/2)))*r/2);
					}else{
						groundInsert[index] = 0;
					}
				}else{
					groundInsert[index] = rooms[id].ground[x+i];
				}
			index++;
		}

		rooms[id].ground = groundLeft.concat(groundInsert).concat(groundRight);
	}

	reassignYValules(id);

	//------END of destruction part------


	//------START of damage scan------
	for(var i = 0; i < rooms[id].numPlayers; i++){
		if(rooms[id].tanks[i].currentX+10 > (x-r) && rooms[id].tanks[i].currentX-10 < (x+r)){
			var damage = 40-Math.round(Math.abs(rooms[id].tanks[i].currentX-x));

			if(damage > 0){
				rooms[id].tanks[i].health-= damage;
			}
		}
	}
	//------END of damage scan------

	smoothGround(id);
	setTimeout(nextPlayer, 500, id);
}
