var app = require("express")();
var http = require("http").Server(app);
var gameserver = require("./server/gameserver");

/**
 * Initialize Gameserver
 */

var gameio = io.of("/gameserver");
gameserver.initialize(gameio);

/**
 * HTTP Server Code
 */

app.get("/", function(req, res) {
    res.sendfile("client/index.html");
});

http.listen(3000, function() {
    console.log("HTTP Server Listening On *:3000");
});
