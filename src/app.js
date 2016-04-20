var config = require('config');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var WebSocketServer = require('ws').Server;
var gameserver = require('./server/gameserver');

/**
 * Initialize GameEngine
 */

var wss = new WebSocketServer({ server: http });
var engine = new gameserver.GameEngine();
engine.initialize(wss, config);

/**
 * HTTP Server Code
 */

var port = config.get('server.port');

app.use(express.static('client'));
app.use('/proto', express.static('proto'));

http.listen(port, function() {
    console.log('HTTP Server Listening On *:' + port);
});
