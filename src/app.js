var config = require('config');
var app = require('express')();
var http = require('http').Server(app);
var path = require("path");
var url = require("url");
var fs = require("fs");
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

app.serveFile = function(url, response) {
    var uri = url.parse(url).pathname,
        filename = path.join(process.cwd(), uri);

    path.exists(filename, function(exists) {
        if(!exists) {
            response.writeHead(404, {"Content-Type": "text/plain"});
            response.write("404 Not Found\n");
            response.end();
            return;
        }

        if (fs.statSync(filename).isDirectory()) filename += '/index.html';

        fs.readFile(filename, "binary", function(err, file) {
            if(err) {
                response.writeHead(500, {"Content-Type": "text/plain"});
                response.write(err + "\n");
                response.end();
                return;
            }
            response.writeHead(200);
            response.write(file, "binary");
            response.end();
        });
    });
};

app.get('/', function(request, response) {
    app.serveFile(url.resolve(request.url, 'client'), response);
});

app.get('/proto', function(request, response) {
    app.serveFile(request.url, response);
});

http.listen(port, function() {
    console.log('HTTP Server Listening On *:' + port);
});
