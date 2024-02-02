document.addEventListener("keydown", keyDownRecieved, false);

var socket = io();
socket.on('message', function(data) {
  console.log(data);
});

setInterval(function() {
  socket.emit('movement', movement);
}, 1000 / 60);

//general setup
var width = 800;
var height = 500;
var groundHeight = 130;

var gravity = 10;
var speed = 2; //tank movement

var ground = [];

var tankHeight = 18;

var activePlayer;
var activeTank;
var numPlayers = 2;
var winner;

//tells if the player took a shot already
var locked = false;

var grey = "#515151";

var blue = "#4f53ee";
var red = "#ee4f4f";
var green = "#4fee6f";
var purple = "#c14fee";

var defaultFill = "#a0a0a0";

var tankImages = [
	document.getElementById("tankImage1"),
	document.getElementById("tankImage2"),
	document.getElementById("tankImage3"),
	document.getElementById("tankImage4"),
	document.getElementById("tank_downImage")
];

//tank specific setup
var tank1 = {
	currentX: 0,
	currentY: 0,
	rotation: 0,

	power: 0,
	angle: 0,
	health: 0,
	fuel: 0,
	color: blue
}

var tank2 = {
	currentX: 0,
	currentY: 0,
	rotation: 0,

	power: 0,
	angle: 0,
	health: 0,
	fuel: 0,
	color: red
}

var tank3 = {
	currentX: 0,
	currentY: 0,
	rotation: 0,

	power: 0,
	angle: 0,
	health: 0,
	fuel: 0,
	color: green
}

var tank4 = {
	currentX: 0,
	currentY: 0,
	rotation: 0,

	power: 0,
	angle: 0,
	health: 0,
	fuel: 0,
	color: purple
}

var tanks = [tank1,tank2,tank3,tank4];

var powerOutput = document.getElementById("powerOutput");
var angleOutput = document.getElementById("angleOutput");
var fuelOutput = document.getElementById("fuelOutput");

var c = document.getElementById("Canvas");
var ctx = c.getContext("2d");

ctx.strokeStyle=grey;
ctx.lineWidth=3;
ctx.fillStyle=grey;
ctx.font = "20px Courier New";

//functions

function init(stage){
	clearField();
	makeGround(stage);

	numPlayers = document.getElementById("numPlayerSelect").value;

	activePlayer = Math.floor(Math.random()*numPlayers)+1;
	activeTank = tanks[activePlayer-1];
	locked = false;

	resetTanks();
	drawField();
	drawTanks();
}

function repaintScene(){
	clearField();
	drawField();
	drawTanks();
}

function resetTanks(){
	for(var i = 0; i < numPlayers; i++){

		switch(i){
			case 0:
			tanks[i].currentX = Math.round(width/10);
			break;

			case 1:
			tanks[i].currentX = width-Math.round(width/10);
			break;

			case 2:
			tanks[i].currentX = width-(Math.round(width/3));
			break;

			case 3:
			tanks[i].currentX =  Math.round(width/3);
			break;
		}

		if(i == 0 || i == 3){
			tanks[i].angle = 45;
		}else{
			tanks[i].angle = 135;
		}

		tanks[i].power = 50;
		tanks[i].health = 100;
		tanks[i].fuel = 100;
	}

	reassignYValules();
}

function keyDownRecieved(e) {
	switch(e.keyCode){
		//enter
		case 13:
		fire();
		break;

		//space
		case 32:
		fire();
		break;

		//arrow left
		case 37:
		changeAngle(1);
		break;

		//arrow right
		case 39:
		changeAngle(-1);
		break;

		//arrow up
		case 38:
		changePower(1);
		break;

		//arrow down
		case 40:
		changePower(-1);
		break;

		//A
		case 65:
		moveTank("l");
		break;

		//D
		case 68:
		moveTank("r");
		break;
	}
}

function nextPlayer(){
	if (checkWin()){
		alert("Player "+(winner+1)+" has won!");

		init(0);
	}else{

		var lastPlayer = activePlayer;

		if(activePlayer < numPlayers){
			activePlayer++;
		}else{
			activePlayer = 1;
		}

		activeTank = tanks[activePlayer-1];

		if(!(activeTank.health > 0)){
			nextPlayer();
		}

		locked = false;
		activeTank.fuel = 100;

		repaintScene();
	}
}

function checkWin(){
	var killCount = 0;
	for(var i = 0; i < numPlayers; i++){
		if(tanks[i].health <= 0){
			killCount++;
		}else{
			winner = i;
		}
	}

	if(killCount == (numPlayers-1)){
		return true;
	}else{
		return false;
	}
}

function moveTank(s){
	if(activeTank.fuel > 0 && !locked){
		switch(s){
			case "r":
			if (activeTank.currentX < 784 && ((height-ground[activeTank.currentX+2])-activeTank.currentY)>-2) {
				activeTank.currentX+=speed;
				activeTank.fuel-=2;
				reassignYValules();
			}
			break;

			case "l":
			if (activeTank.currentX > 16 && ((height-ground[activeTank.currentX-2])-activeTank.currentY)>-2) {
				activeTank.currentX-=speed;
				activeTank.fuel-=2;
				reassignYValules();
			}
			break;
		}

		repaintScene();
	}
}

function changePower(value){
	if(activeTank.power+value <= 100 && activeTank.power+value >= 0 && !locked){
		activeTank.power+=value;
		repaintScene();
	}
}

function changeAngle(value){
	if(activeTank.angle+value >= 0 && activeTank.angle+value <= 180 && !locked){
		activeTank.angle+=value;
		repaintScene();
	}
}

function makeGround(s){
	switch(s){

	//flat
	case 0:
	for (var i = 0; i < width; i++) {
		ground[i] = groundHeight;
	}
	break;

	//Sin
	case 1:
	for (var i = 0; i < width; i++) {
		ground[i] = Math.sin(i/30)*20+groundHeight;
	}
	break;

	//castle
	case 2:
	for (var i = 0; i < width; i++) {
		if(i > 133-10 && i < 133+10){
			ground[i] = groundHeight+70;
		}else if(i > 133*3-10 && i < 133*3+10){
			ground[i] = groundHeight+70;
		}else if(i > 133*5-10 && i < 133*5+10){
			ground[i] = groundHeight+70;
		}else{
			ground[i] = groundHeight;
		}
	}
	break;

	//valley
	case 3:
	for (var i = 0; i < width; i++) {
		if((i > width/2-300 && i < width/2-70) || (i > width/2+70 && i < width/2+300)){
			ground[i] = 30;
		}else{
			ground[i] = groundHeight;
		}
	}
	break;

	//slope /
	case 4:
		for(var i = 0; i < width; i++){
			ground[i] = (i/3)+50;
		}
	break;

	//slope \
	case 5:
		for(var i = 0; i < width; i++){
			ground[i] = ((width-i)/3)+50; 
		}
	break;

	//hill
	case 6:
		for(var i = 0; i < width; i++){
			ground[i] = Math.sin(i/250)*200+groundHeight; 
		}
	break;

	//bump
	case 7:
		for(var i = 0; i < width; i++){
			ground[i] = -Math.sin(i/250)*200+groundHeight+130; 
		}
	break;
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

	ctx.fillStyle=defaultFill;
	ctx.stroke();
	ctx.fill();

	//borders
	ctx.strokeStyle = "#fff";
	ctx.beginPath();
	ctx.rect(0,0,width,height);
	ctx.stroke();

	ctx.strokeStyle = grey;

}

function smoothGround(){
	var onLevel = false;

	for(var i = 2; i < ground.length-2; i++){
		onLevel = false;

		if((ground[i] - ground[i-2]) > -1 && (ground[i] - ground[i+2]) < 1){
			onLevel = true;
		}

		if(!onLevel && i > 0+5 && i < width-5){
			if(Math.abs(ground[i] - ground[i-1]) == 0){
				ground[i] = ground[i-1];
			}else if(Math.abs(ground[i] - ground[i+1]) == 0){
				ground[i] = ground[i+1];
			}else{
				ground[i] = (ground[i-1]+ground[i+1])/2;
			}
		}
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
			ctx.drawImage(tankImages[i],-15,-21,30,20);
			drawCanon(0,0,tanks[i].angle,tanks[i].color);
		}else{
			ctx.drawImage(tankImages[4],-15,-21,30,20);
			drawCanon(0,0,tanks[i].angle,"#828282");
		}

		ctx.restore();

		if(tanks[i].health > 0){
			writeTankInfo(("P"+(i+1)),health,x,y,tanks[i].color,i);	
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
	//ctx.strokeStyle = "#000";

	ctx.fillText(text,x-10,y-55);

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

function reassignYValules(){
	for(var i = 0; i < numPlayers; i++){
		tanks[i].currentY = height-ground[tanks[i].currentX];
		tanks[i].rotation = Math.atan((ground[tanks[i].currentX-1] - ground[tanks[i].currentX+1])/2)*180/Math.PI;
	}	
}

function fire(){
	if(!locked){
		locked = true;

		var velocityX = Math.cos((activeTank.angle-activeTank.rotation)* Math.PI / 180)*activeTank.power;
		var velocityY = -Math.sin((activeTank.angle-activeTank.rotation)* Math.PI / 180)*activeTank.power;

		var shotX = activeTank.currentX;
		var shotY = activeTank.currentY-12;

		var tail = [];

		drawNextPointOnPath(shotX, shotY, velocityX, velocityY, tail, 0);
	}
}

function drawNextPointOnPath(shotX, shotY, velocityX, velocityY, tail, count){

	//clear previous
	repaintScene();

	if(shotY <= height-ground[Math.round(shotX)]){
		shotX += velocityX/10; //higher precision by dividing by 10
		shotY += velocityY/10;

		//START of tail part
		if(tail.length == 20){
			tail.shift();
		}

		tail.push([shotX,shotY]);

		for(var i = 0; i < tail.length; i++){
			ctx.beginPath();
			ctx.fillStyle = activeTank.color;
			ctx.arc(tail[i][0], tail[i][1], 2*i/10, -Math.PI/2, 2 * Math.PI);
			ctx.fill();
		}

		count++;
		//END of tail part

		velocityY += gravity/10;

		//draw shot
		ctx.strokeStyle = activeTank.color;

		ctx.beginPath();
		ctx.arc(shotX, shotY, 2, -Math.PI/2, 2 * Math.PI);
		ctx.stroke();
		ctx.fill();

		//reset
		ctx.fillStyle = defaultFill;
		ctx.strokeStyle = grey;

		setTimeout(drawNextPointOnPath, 10, shotX, shotY, velocityX, velocityY, tail, count);
	}else if(shotX > 0 && shotX < width){
		hitScan(Math.round(shotX), Math.round(shotY), 40);
	}else{
		setTimeout(nextPlayer, 500);
	}
}

function hitScan(x,y,r){
	var groundLeft = [];
	var groundRight = [];
	var groundInsert = [];

	//------START of destruction part------
	//x noch im feld?
	if(x-r < 0){
		x = r;
	}

	for(var i = 0; i < (x-r); i++){
		groundLeft[i] = ground[i];
	}

	var index = 0;
	for(var i = (x+r); i < ground.length; i++){
		groundRight[index] = ground[i];
		index++;
	}


	//x nicht eine wand?
	if(ground[x] - ground[x-1] < 5 && ground[x] - ground[x+1] < 5){
		index = 0;
		for(var i = -r; i < r; i++){

				//y bei x+i noch im radius?
				if(ground[x+i] >= ground[x]-r-3 && ground[x+i] <= ground[x]+r+3){

					//y - radius bei x+i noch grösser gleich 0?
					if(ground[x+i]-Math.abs(Math.sin(index/(r/(Math.PI/2)))*r/2) >= 0){
						groundInsert[index] = ground[x+i]-Math.abs(Math.sin(index/(r/(Math.PI/2)))*r/2);
					}else{
						groundInsert[index] = 0;
					}
				}else{
					groundInsert[index] = ground[x+i];
				}
			index++;
		}

		ground = groundLeft.concat(groundInsert).concat(groundRight);
	}

	reassignYValules();

	//------END of destruction part------


	//------START of damage scan------
	for(var i = 0; i < numPlayers; i++){
		if(tanks[i].currentX+10 > (x-r) && tanks[i].currentX-10 < (x+r)){
			tanks[i].health-=20;
		}
	}
	//------END of damage scan------

	smoothGround();
	repaintScene();
	setTimeout(nextPlayer, 500);
}

function debug(arg1, arg2, arg3){

	output = document.getElementById("debugOutput");
	
	output.innerHTML = "groundY: "+ground[Math.round(arg1)];
}