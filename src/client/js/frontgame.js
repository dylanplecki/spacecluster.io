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
var velocity = 1/50
var gameObjs = [];
//var main    = new GameObj(5, 100, 100, 50, 2, 100,"dude", "main", "#330000");
gameObjs[0] = new GameObj(0, 1000, 1000, 10, 4, 270, "player", "ragusauce", "#234094");
gameObjs[1] = new GameObj(1, 500, 20, 100, 4, 180, "player", "ragusauce2", "#F33023");
gameObjs[2] = new GameObj(2, 10, 500, 60, 4, 170, "player", "pn", "#DEF8AF");
gameObjs[3] = new GameObj(3, 800, 900, 60, 4, 360, "player", "dPlecki", "#F324FA"); // PINK
gameObjs[4] = new GameObj(4, 30, 30, 200, 4, 170, "player", "dooope", "#ABCDEF");  // BLUE

//DEBUG
console.log("SCREENWIDTH: " + screenWidth);
console.log("SCREENHEIGHT: " + screenHeight);

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
    var y = (food.y) + screenHeight/2 - main.y; // Trnslate so main is in middle
    var x = (food.x) + screenWidth/2 - main.x;
    
    distance = Math.sqrt( Math.pow(x-screenWidth/2, 2) + Math.pow(y - screenHeight/2, 2));
    if(distance < main.size
         && food.draw == true)
    {
        main.size += 1;
        food.draw = false;
    }
    else if (food.draw == true)
        drawCircle(x, y, 10, 10);
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

    for (var x = screenWidth/2 - main.x; x < screenWidth; x += screenHeight / 18) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, screenHeight);
    }

    for (var y = screenHeight/2 - main.y; y < screenHeight; y += screenHeight / 18) {
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
    drawMain(main);
    
    // ITERATOR FOR TREE
    var it = tree.iterator(), item;
    while((item = it.next()) !== null)
    {
        drawPlayer(item);
    }
    
    
    gameObjs.forEach(drawPlayer);
}
draw();

function drawPlayer(player) {
    ctx.fillStyle = player.theme;

    if (   player.x + player.size > main.x - screenWidth/2 
        && player.x - player.size < main.x + screenWidth/2
        && player.y + player.size > main.y - screenHeight/2
        && player.y - player.size < main.y + screenHeight/2)
    {
        var y = (player.y) + screenHeight/2 - main.y; // Trnslate so main is in middle
        var x = (player.x) + screenWidth/2 - main.x; // Translate so main is in middle
        
        drawCircle(x, y, player.size, 100);
        ctx.fillStyle = "#000000"
        ctx.fillText(player.x + " " + player.y, x, y);
    }
}

function drawMain(player)
{
    ctx.fillStyle = player.theme;
    main.x += parseInt(target.x * velocity);
    main.y += parseInt(target.y * velocity);
    drawCircle(screenWidth/2, screenHeight/2, player.size, 100);
    ctx.fillStyle = "#000000"
    ctx.fillText(main.x + " " + main.y, screenWidth/2, screenHeight/2);
}


function gameInput(mouse) {
	if (!directionLock) {
		target.x = mouse.clientX - screenWidth/2;
		target.y = mouse.clientY - screenHeight/2;
	}
}

function GameObj(id, x, y, size, velocity, azimuth, type, name, theme) {
	this.id = id;
	this.x  = x;
	this.y = y;
	this.size = size;
    this.velocity = velocity;
	this.azimuth = azimuth;
	this.type = type;
	this.description = name;
	this.theme = theme;
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