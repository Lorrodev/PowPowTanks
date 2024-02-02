document.addEventListener("keydown", keyDownRecieved, false);
document.addEventListener("keyup", keyUpRecieved, false);

var socket = io();

var numPlayers = 0;

var roomId = "Welcome";

var driving = false;

socket.on('fire', function(shotInformation){
	shotX = shotInformation[0];
	shotY = shotInformation[1];
	velocityX = shotInformation[2];
	velocityY = shotInformation[3];
	tail = shotInformation[4];
	activeShot = true;
});

setInterval(function() {
	if(input != null && input != 0){
  		socket.emit('clientInput', roomId, input);
	}
}, 1000 / 30);

socket.on('impact', function(x){
	playSound(explosionSound, 1);
	impactAnimation(x, 0);
});

socket.on('hit', function(){
	playSound(hitSound, 0.2);
});

socket.on('stopFire', function(){
	activeShot = false;
});

socket.on('playerNum', function(playerNum){
	me = playerNum;
	//console.log("recieved playernum"+playerNum);
});

socket.on('numPlayers', function(numP){
	numPlayers = numP;
});

socket.on('roomId', function(id){
	roomId = id;
	idSpan.innerHTML = "Room ID: "+roomId;
	hiddenIdText.value = roomId;
});

socket.on('newMessage', function(message){
	if(chat.length > 12){
		chat.shift();
	}

	chat.push(message);

	writeOutChat();
});

socket.on('levelChanged', function(lvl){
	level = lvl;
});

socket.on('roomNotExisting', function(){
	resetClient();

	var cover = document.getElementById("cover");
	var setupDiv = document.getElementById("setupDiv");

    cover.style.display = "block";
    setupDiv.style.display = "block";

	roomId = "Welcome";
	idSpan.innerHTML = "Room ID: "+roomId;
	hiddenIdText.value = roomId;

	alert("This room doesn't exist or it is already full");
});

//general setup
var width = 800;
var height = 500;

var gravity = 10;
var speed = 2; //tank movement

var ground = [];

var activePlayer = 1;
var activeTank;
var me;

var chat = [];

var repaintReady = false;

var input;

var level = 8;

var locked = false;

var activeShot = false;

var shotX;
var shotY;
var velocityX;
var velocityY;
var tail;

var grey = "#515151";

var blue = "#4f53ee";
var red = "#ee4f4f";
var green = "#4fee6f";
var purple = "#c14fee";
var yellow = "#ffdd00";

var defaultFill = "#a0a0a0";

var tankImages = [
	document.getElementById("tankImage1"),
	document.getElementById("tankImage2"),
	document.getElementById("tankImage3"),
	document.getElementById("tankImage4"),
	document.getElementById("tank_downImage")
];

var tanks = [];

var c = document.getElementById("Canvas");
var ctx = c.getContext("2d");

var idSpan = document.getElementById("idSpan");
idSpan.innerHTML = "Room ID: "+roomId;

var hiddenIdText = document.getElementById("hiddenIdText");
hiddenIdText.value = roomId;

var chatTextTable = document.getElementById("chatTextTable");
var chatInputField = document.getElementById("chatInputField");
var senButton = document.getElementById("chatSendButton");

ctx.strokeStyle=grey;
ctx.lineWidth=3;
ctx.fillStyle=grey;
ctx.font = "20px Arial";

socket.on('state', function(data) {
	tanks = data[0];
	activePlayer = data[1];
	activeTank = tanks[activePlayer-1];
	ground = data[2];
	repaintReady = true;
	//console.log("Data recieved");
});

socket.on('win', function(winner){
	alert(winner+" has won!");
});

window.setInterval(repaintScene, 1000/25);
window.setInterval(deleteOldMessages, 5000);


//functions
function writeOutChat(){
	var chatText = "";
	for(var i = 0; i < chat.length; i++){
		if(chat[i] != null){
				chatText += chat[i]+"<br>";	
		}
	}
	chatTextTable.innerHTML = chatText;
}

function deleteOldMessages(){
	if(chat.length > 5){
		chat.shift();
		writeOutChat();
	}
}

function sendMessage(){
	var message = chatInputField.value;

	if(message != ""){
		socket.emit('sendMessage', roomId, message, me);
		chatInputField.value = "";	
	}

	chatSendButton.blur();
}


function resetRoom(){
	socket.emit('reset',roomId);
	numPlayers = 0;
}

function leaveRoom(){
	socket.emit('leaveRoom', roomId, me);
}

function createNewRoom(){
	var newRoomButton = document.getElementById("newRoomButton");

	var cover = document.getElementById("cover");
	var setupDiv = document.getElementById("setupDiv");

	var nick = document.getElementById("nicknameField").value;

    cover.style.display = "none";
    setupDiv.style.display = "none";

    newRoomButton.blur();

    socket.emit('newPlayer',level,nick);
}

function copyRoomId(){
	hiddenIdText.style.display = "block";
	hiddenIdText.select();
	document.execCommand("copy");
	hiddenIdText.style.display = "none";
}

function joinGame(){
	var joinButton = document.getElementById("joinButton");
	var joinIdField = document.getElementById("joinId");

	var cover = document.getElementById("cover");
	var setupDiv = document.getElementById("setupDiv");

	var nick = document.getElementById("nicknameField").value;

    cover.style.display = "none";
    setupDiv.style.display = "none";

	var newId = parseInt(joinIdField.value);

	joinButton.blur();

	resetClient();

	socket.emit('changeRoom', roomId, newId, nick);
	roomId = newId;
	idSpan.innerHTML = "Room ID: "+roomId;
	hiddenIdText.value = roomId;
}

function repaintScene(){
	if(repaintReady){
		clearField();
		drawField();
		drawTanks();
		if(activeShot){
			drawNextPointOnPath();
		}
	}
}

function keyDownRecieved(e) {
	if(document.activeElement != chatInputField){
		switch(e.keyCode){
			//enter
			case 13:
			input = "fire";
			playSound(fireSound, 1);
			break;

			//space
			case 32:
			input = "fire";
			playSound(fireSound, 1);
			break;

			//arrow left
			case 37:
			input = "increaseAngle";
			playSound(alignSound, 1);
			break;

			//arrow right
			case 39:
			input = "decreaseAngle";
			playSound(alignSound, 1);
			break;

			//arrow up
			case 38:
			input = "increasePower";
			break;

			//arrow down
			case 40:
			input = "decreasePower";
			break;

			//A
			case 65:
			input = "moveLeft";
			if(tanks[me-1].fuel > 0){
				driving = true;
				playSound(driveSound, 1);
			}
			break;

			//D
			case 68:
			input = "moveRight";
			if(tanks[me-1].fuel > 0){
				driving = true;
				playSound(driveSound, 1);
			}
			break;
		}
	}else if(e.keyCode == 13){
		sendMessage();
	}
}

function levelSelect(lvl){
	level = lvl;

	for(var i = 0; i < 9; i++){
		document.getElementById("level"+i).removeAttribute("class");
	}

	document.getElementById("level"+lvl).setAttribute("class", "activeLevel");
}

function changeMap(){
	for(var i = 0; i < 9; i++){
		document.getElementById("updateLevel"+i).removeAttribute("class");
	}
	document.getElementById("updateLevel"+level).setAttribute("class", "activeLevel");

	cover.style.display = "block";
    changeMapDiv.style.display = "block";
}

function closeMapDiv(){
	cover.style.display = "none";
    changeMapDiv.style.display = "none";
}

function levelUpdate(lvl){
	cover.style.display = "none";
    changeMapDiv.style.display = "none";

    level = lvl;

    socket.emit('changeMap', roomId, lvl, me);
}

function resetClient(){
	ground = [];

	activePlayer = 1;
	activeTank = 0;
	me = 0;

	repaintReady = false;

	input = 0;

	locked = false;

	activeShot = false;

	shotX = 0;
	shotY = 0;
	velocityX = 0;
	velocityY = 0;
	tail = [];

}

function keyUpRecieved(e) {
	input = 0;

	//Sound controlls
	if(document.activeElement != chatInputField){
		switch(e.keyCode){
			//arrow left
			case 37:
			stopSound(alignSound);
			playSound(stopAlignSound, 0.7);
			break;

			//arrow right
			case 39:
			stopSound(alignSound);
			playSound(stopAlignSound, 0.7);
			break;

			//A
			case 65:
			stopSound(driveSound);
			if(driving){
				driving = false;
				playSound(stopDriveSound, 1);
			}
			break;

			//D
			case 68:
			stopSound(driveSound);
			if(driving){
				driving = false;
				playSound(stopDriveSound, 1);
			}
			break;
		}
	}
}

function clearField(){
	ctx.clearRect(1, 1, width-2, height-1);
}

function drawField(){
	ctx.beginPath();
	moveTo(0, ground[0]);

	for (var i = 0; i < ground.length; i++) {
		ctx.lineTo(i,height-ground[i]);
	}

	ctx.lineTo(width,height);
	ctx.lineTo(0,height);
	ctx.lineTo(0,height-ground[i]);

	//gradient

	var grd=ctx.createLinearGradient(0,height,0,height-200);

	/*Winter edition colors
	grd.addColorStop(0, "#bbf2f7");
	grd.addColorStop(1, "#fcfcfc");
	*/

	//normal colors
	grd.addColorStop(0,"#ffbb00");
	grd.addColorStop(1,"#ffe396");

	ctx.fillStyle=grd;
	//ctx.fillRect(20,20,150,100);

	//gradient

	//ctx.fillStyle=defaultFill;
	ctx.stroke();
	ctx.fill();

	//borders
	ctx.strokeStyle = "#ffbb00";
	ctx.beginPath();
	ctx.rect(0,0,width,height);
	ctx.stroke();

	ctx.strokeStyle = grey;

	if(numPlayers < 2){
		ctx.fillStyle = "#fff";
		ctx.fillText("Waiting for players...",310,height/2-10);
		ctx.fillText("Tell your friends to join on ID "+roomId,230,height/2+20);
		ctx.fillStyle=defaultFill;
	}

}

function drawTanks(){
	for(var i = 0; i < numPlayers; i++){
		var x = tanks[i].currentX;
		var y = tanks[i].currentY;
		var health = tanks[i].health;

		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(tanks[i].rotation*Math.PI/180);

		if(tanks[i].health > 0){
			drawCanon(0,0,tanks[i].angle,tanks[i].color);
			ctx.drawImage(tankImages[i],-15,-21,30,20);
		}else{
			drawCanon(0,0,tanks[i].angle,"#828282");
			ctx.drawImage(tankImages[4],-15,-21,30,20);
		}

		ctx.restore();

		if(tanks[i].health > 0){
			writeTankInfo(tanks[i].name,health,x,y,tanks[i].color,i);	
		}
	}
}

function writeTankInfo(text,health,x,y,color,i){
	ctx.fillStyle = color;
	ctx.strokeStyle = color;

	if (activeTank == tanks[i]){
		//cursor over active tank
		ctx.beginPath();
		ctx.moveTo(x-10,y-90);
		ctx.lineTo(x+10,y-90);
		ctx.lineTo(x,y-80);
		ctx.lineTo(x-11,y-91);
		ctx.stroke();

		//power
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.rect(x-14,y-42,28/100*tanks[i].power,4);
		ctx.fillStyle = color;
		ctx.fill();
	}

	ctx.lineWidth = 1;

	//name
	ctx.fillText(text,x-(tanks[i].name.length)*5,y-55);

	//health
	ctx.beginPath();
	ctx.rect(x-14,y-47,28/100*tanks[i].health,4);
	ctx.fillStyle = "#92d66b";
	ctx.fill();

	//reset
	ctx.lineWidth = 3;
	ctx.fillStyle = defaultFill;
	ctx.strokeStyle = grey;
}

function drawCanon(x,y,angle,color){
	ctx.strokeStyle = color;
	ctx.lineWidth = 4;

	ctx.beginPath();
	ctx.moveTo(x,y-12);

	var canonX = Math.round(x+(21*Math.cos(angle*Math.PI/180)));
	var canonY = Math.round(y-12-(21*Math.sin(angle*Math.PI/180)));

	ctx.lineTo(canonX,canonY);
	ctx.stroke();

	//reset
	ctx.strokeStyle = grey;
	ctx.lineWidth = 3;
}

function drawNextPointOnPath(){

	if(shotY <= height-ground[Math.round(shotX)]){
		shotX += velocityX/10; //higher precision by dividing by 10
		shotY += velocityY/10; //Warning: changing /10 part will change shot speed

		//START of tail part
		for(var i = 0; i < tail.length; i++){
			ctx.beginPath();
			//ctx.fillStyle = "#fcfcfc"; //Winter edition colors
			ctx.fillStyle = activeTank.color; //Default shot color
			ctx.arc(tail[i][0], tail[i][1], 2*i/10, -Math.PI/2, 2 * Math.PI);
			ctx.fill();
		}
		//END of tail part

		velocityY += gravity/10;

		//draw shot
		//ctx.strokeStyle = "#fcfcfc"; //Winter edition colors
		ctx.strokeStyle = activeTank.color; //Default color

		ctx.beginPath();
		ctx.arc(shotX, shotY, 2, -Math.PI/2, 2 * Math.PI);

		ctx.stroke();
		ctx.fill();

		//reset
		ctx.fillStyle = defaultFill;
		ctx.strokeStyle = grey;
	}
}

function impactAnimation(x, count){
	var impactX = x;
	var impactY = height-ground[Math.round(x)]-10;

	if(count < 20){
		ctx.moveTo(impactX,impactY);

		//Winter edition colors
		/*
		ctx.strokeStyle = "#fcfcfc";
		ctx.fillStyle = "#fcfcfc";
		*/

		/* Default colors */
		ctx.strokeStyle = activeTank.color;
		ctx.fillStyle = activeTank.color;

		ctx.beginPath();
		ctx.arc(impactX, impactY, count*2, -Math.PI/2, 2 * Math.PI);
		ctx.stroke();
		ctx.fill();
		count++;

		//reset
		ctx.fillStyle = defaultFill;
		ctx.strokeStyle = grey;

		window.setTimeout(impactAnimation, 1, x, count);
	}
}

//Sounds
var fireSound = new Audio("static/sounds/fire.wav");
var explosionSound = new Audio("static/sounds/explosion.wav");
var hitSound = new Audio("static/sounds/hit.wav");
var alignSound = new Audio("static/sounds/align.wav");
var driveSound = new Audio("static/sounds/drive.wav");
var stopAlignSound = new Audio("static/sounds/stop_align.wav");
var stopDriveSound = new Audio("static/sounds/stop_drive.wav");

function playSound(sound, volume, clone=false, speed=1){
    if(clone){
        var soundClone = sound.cloneNode();
        soundClone.volume = volume;

        speed = speed > 0.8 ? speed : 0.8;
        speed = speed < 3 ? speed : 3;
        sound.playbackRate = speed;

        soundClone.play();
    }
    sound.volume = volume;
    
    speed = speed > 0.8 ? speed : 0.8;
    speed = speed < 3 ? speed : 3;
    sound.playbackRate = speed;
    
    sound.play();
}

function stopSound(sound){
	sound.pause();
	sound.currentTime = 0;
}

/*
setInterval(fancyBackground, 3000);

function fancyBackground(){
	var y = 40;
	var count = 0;

	drawFancyStripe(count, y);
	console.log("called");
}

function drawFancyStripe(count, y){
	ctx.moveTo(count,y);
	ctx.beginPath();
	ctx.strokeStyle = "#ffbb00";
	ctx.lineTo(count+15, y);
	ctx.stroke();

	console.log("Called Stripe");

	if(count < width){
		count++;
		setTimeout(drawFancyStripe(y, count), 1000/10);
	}else{
		console.log("terminated");
	}
}*/
