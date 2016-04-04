var config = require('config');
var app = require('express')();
var http = require('http').Server(app);
var WebSocketServer = require('ws').Server;
var gameserver = require('./server/gameserver');

/**
 * Initialize Gameserver
 */

var wss = new WebSocketServer({ server: http });
gameserver.initialize(wss, config);

/**
 * HTTP Server Code
 */

var port = config.get('server.port');

app.get('/', function(req, res) {
    res.sendfile('client/index.html');
});

http.listen(port, function() {
    console.log('HTTP Server Listening On *:' + port);
});
