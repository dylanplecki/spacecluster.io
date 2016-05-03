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
var scalar = 1/50
var gameObjs = [];
// //var main    = new GameObj(5, 100, 100, 50, 2, 100,"dude", "main", "#330000");
// gameObjs[0] = new GameObj(0, 1000, 1000, 10, 4, 270, "player", "ragusauce", "#234094");
// gameObjs[1] = new GameObj(1, 500, 20, 100, 4, 180, "player", "ragusauce2", "#F33023");
// gameObjs[2] = new GameObj(2, 10, 500, 60, 4, 170, "player", "pn", "#DEF8AF");
// gameObjs[3] = new GameObj(3, 800, 900, 60, 4, 360, "player", "dPlecki", "#F324FA"); // PINK
// gameObjs[4] = new GameObj(4, 30, 30, 200, 4, 170, "player", "dooope", "#ABCDEF");  // BLUE

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
    var y = absoluteToRelativeY(food.y); // Trnslate so main is in middle
    var x = absoluteToRelativeX(food.x);
    
    distance = Math.sqrt( Math.pow(x-screenWidth/2, 2) + Math.pow(y - screenHeight/2, 2));
    if(distance < main.size && food.draw == true)
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


    for (var x = absoluteToRelativeX(0) ; x < screenWidth; x += screenHeight / 18) {
        ctx.moveTo(x, absoluteToRelativeY(0));
        ctx.lineTo(x, screenHeight);
    }

    for (var y = absoluteToRelativeY(0) ; y < screenHeight; y += screenHeight / 18) {
        ctx.moveTo(absoluteToRelativeX(0), y);
        ctx.lineTo(screenWidth, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
}

function draw() {
	c.width = window.innerWidth;
	c.height = window.innerHeight;
	screenWidth = window.innerWidth;
	screenHeight = window.innerHeight;

    if (settings.log_statistics) ++stat_fps; // Declared in game.js
    ctx.clearRect(0, 0, screenWidth, screenHeight);
    requestAnimationFrame(draw);

    drawBackground();
    drawgrid();
    foods.forEach(drawFood);

    // ITERATOR FOR TREE
    //var it = tree.iterator(), item;
    //while((item = it.next()) !== null)
    //{
    //    drawPlayer(item);
    //}
    var id;
    //console.log("drawing");
    for(id in game_objects) {
        if (!game_objects.hasOwnProperty(id)) continue;
        if (checkIfEaten(game_objects[id]) ) continue;
       	drawPlayer(game_objects[id]);
    }

    drawMain(main);
}

function checkIfEaten(player)
{
	var x = absoulteToRelativeX(player.x);
	var y = absoluteToRelativeY(player.y);

	distance = Math.sqrt( Math.pow(x-screenWidth/2, 2) + Math.pow(y - screenHeight/2, 2));

    if (distance < main.size && main.size > player.size && player.id != -1)
    {
        peopleEaten.push(player.id);
        player.id = -1;
        return 1;
    }

	return 0;

}
function drawPlayer(player) {
    ctx.fillStyle = player.theme;

    if (   player.x + player.size > main.x - screenWidth/2 
        && player.x - player.size < main.x + screenWidth/2
        && player.y + player.size > main.y - screenHeight/2
        && player.y - player.size < main.y + screenHeight/2)
    {
        var y = absoluteToRelativeY(player.y + Math.sin(player.azimuth) * player.velocity * (currentTick - player.lastTick)); // Trnslate so main is in middle
        var x = absoluteToRelativeX(player.x + Math.cos(player.azimuth) * player.velocity * (currentTick - player.lastTick)); // Translate so main is in middle
        
        drawCircle(x, y, player.size, 100);
        ctx.fillStyle = "#000000";
        ctx.fillText(player.x + " " + player.y, x, y);
    }
}

function drawMain(player)
{
    ctx.fillStyle = player.theme;
    if ( !(main.x < 0 && target.x < 0))
        main.x += Math.round(target.x * scalar);
    if (main.x < 0)
        main.x = 0;
    if ( !(main.y < 0 && target.y < 0))
        main.y += Math.round(target.y * scalar);
    if (main.y < 0)
        main.y = 0;
    drawCircle(screenWidth/2, screenHeight/2, player.size, 100);
    ctx.fillStyle = "#000000";
    ctx.fillText(main.x + " " + main.y, screenWidth/2, screenHeight/2);
}


function gameInput(mouse) {
	if (!directionLock) {
		target.x = mouse.clientX - screenWidth/2;
		target.y = mouse.clientY - screenHeight/2;
	}
}

function absoluteToRelativeX(x)
{
    return x + screenWidth/2 - main.x;
}

function absoluteToRelativeY(y)
{
    return y + screenHeight/2 - main.y;
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

function start(){
   // var image_x = document.getElementById('play');
    //image_x.parentNode.removeChild(image_x);
    draw();
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

//------------//
// DYLAN CODE //
//------------//

(function() {
    var fps = 60;

    setInterval(function() {
        if (settings.log_statistics) ++stat_fps; // Declared in game.js

        // Clear canvas
        ctx.clearRect(0, 0, screenWidth, screenHeight);

        // Draw background
        ctx.save();
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, screenWidth, screenHeight);
        ctx.restore();

        // Draw grid
        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#FFFFFF";
        ctx.globalAlpha = 0.15;
        ctx.beginPath();
        
        for (var x = absoluteToRelativeX(0) ; x < screenWidth; x += screenHeight / 18) {
            ctx.moveTo(x, absoluteToRelativeY(0));
            ctx.lineTo(x, screenHeight);
        }

        for (var y = absoluteToRelativeY(0) ; y < screenHeight; y += screenHeight / 18) {
            ctx.moveTo(absoluteToRelativeX(0), y);
            ctx.lineTo(screenWidth, y);
        }
        
        ctx.stroke();
        ctx.restore();

        // Draw current (main) player
        ctx.save();

        ctx.beginPath();
        ctx.arc(screenWidth/2, screenHeight/2, main.size, 0, 2*Math.PI);
        ctx.fillStyle = main.theme;
        ctx.fill();

        ctx.fillStyle = "#000000";
        ctx.fillText(main.x + " " + main.y, screenWidth/2, screenHeight/2);

        ctx.restore();

        // Draw other objects
        ctx.save();
        foods.forEach(drawFood);

        for(var id in game_objects) {
            if (!game_objects.hasOwnProperty(id)) continue;
            drawPlayer(game_objects[id]);
        }
        ctx.restore();

        // Update player position
        if ( !(main.x < 0 && target.x < 0))
            main.x += Math.round(target.x * scalar);
        if (main.x < 0)
            main.x = 0;

        if ( !(main.y < 0 && target.y < 0))
            main.y += Math.round(target.y * scalar);
        if (main.y < 0)
            main.y = 0;

        // --- End frame
    }, (1000 / fps))
}());
