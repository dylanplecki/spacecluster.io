var c = document.getElementById("cvs");
c.width = window.innerWidth;
c.height = window.innerHeight;
var ctx = c.getContext("2d");
var screenWidth = window.innerWidth;
var screenHeight = window.innerHeight;
var directionLock = false;
var size = 50;

var foods = [];
var target = {x: 0, y: 0};
var player = {x: screenWidth/2, y: screenHeight/2}
var velocity = 1/50

function drawCircle(centerX, centerY, radius, sides) {
    var theta = 0;
    var x = 0;
    var y = 0;
 
    ctx.beginPath();

    for (var i = 0; i < sides; i++) {
        theta = (i / sides) * 2 * Math.PI;
        x = centerX + radius * Math.sin(theta);
        y = centerY + radius * Math.cos(theta);
        ctx.lineTo(x, y);
    }

    ctx.closePath();
    //ctx.stroke();
    ctx.fill();
}

function drawFood(food){
    ctx.fillStyle = "#FFFFFF";
    food.x -= target.x * velocity;
    food.y -= target.y * velocity;
    if(food.x < player.x + size && food.x > player.x - size && food.y < player.y + size && food.y > player.y - size && food.draw == true){
        size += 1;
        food.draw = false;
    }
    else if (food.draw == true)
        drawCircle(food.x, food.y, 10, 10);
}

// TESTING FUNCTION
function createFood(){
    for (var i = 0; i < 50; i ++){
        foods.push({
            x: Math.floor(Math.random() * screenWidth),
            y: Math.floor(Math.random() * screenHeight),
            draw: true
        });
    }
}
createFood();

c.addEventListener('mousemove', gameInput, false);

function drawBackground(){
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, screenWidth, screenHeight);
}

function drawgrid() {
     ctx.lineWidth = 1;
     ctx.strokeStyle = "#FFFFFF";
     ctx.globalAlpha = 0.15;
     ctx.beginPath();

    for (var x = 0; x < screenWidth; x += screenHeight / 18) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, screenHeight);
    }

    for (var y = 0; y < screenHeight; y += screenHeight / 18) {
        ctx.moveTo(0, y);
        ctx.lineTo(screenWidth, y);
    }

    ctx.stroke();
    ctx.globalAlpha = 1;
}

function draw() {
    requestAnimationFrame(draw);
    drawBackground();
    drawgrid();
    foods.forEach(drawFood);
    drawPlayer();
}
draw();

function drawPlayer() {
    ctx.fillStyle = "#330000";
    drawCircle(screenWidth/2, screenHeight/2, size, 100);
}

function gameInput(mouse) {
	if (!directionLock) {
		target.x = mouse.clientX - screenWidth/2;
		target.y = mouse.clientY - screenHeight/2;
	}
}



// Needed to have animation frames work on all browsers: Found on github
(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame']
                                   || window[vendors[x]+'CancelRequestAnimationFrame'];
    }
 
    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
 
    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());