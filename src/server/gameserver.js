var uuid = require("node-uuid"); // TODO: Change from UUID

(function() {

    /*-----------------------*/
    /* Game Data Descriptors */
    /*-----------------------*/

    function player(name, theme, ip) {
        this.id = uuid.v4();
        this.name = name;
        this.theme = theme;
        this.ipAddress = ip;
    }

    function gameobject(id, type, x, y, z, vel, azi, size) {
        if (id === null) {
            id = uuid.v4();
        }
        this.id = id;
        this.type = type;
        this.xPos = x;
        this.yPos = y;
        this.zPos = z;
        this.velocity = vel;
        this.azimuth = azi;
        this.size = size;
    }

    /*----------------------------*/
    /* Game Engine Implementation */
    /*----------------------------*/

    var engine = {};
    engine.initialized = false;
    
    engine.tick = 0;
    engine.frames = [];
    engine.players = [];
    engine.wss = null; // Web Socket Server
    engine.tickRate = 0;
    engine.frameTime = 0;
    
    /**
     * Function: engine.addNewPlayer
     * Arguments:
     *      1. newPlayer: impl of 'player' proto
     */
    engine.addNewPlayer = function (newPlayer) {
        // TODO
    };

    /**
     * Function: engine.onServerTick
     * Arguments: None
     */
    engine.onServerTick = function() {
        // TODO
        ++engine.tick;
    };

    /**
     * Function: engine.onClientConnect
     * Arguments:
     *      1. socket: WS connection socket
     * Returns: Nothing
     */
    engine.onClientConnect = function(wss) {
        // TODO
    };

    /**
     * Function: engine.onClientMessage
     * Arguments:
     *      1. data: client data packet
     * Returns: Nothing
     */
    engine.onClientMessage = function(data, flags) {
        // TODO
    };

    /**
     * Function: engine.onClientDisconnect
     * Arguments:
     *      1. code: WS specification reason code
     *      2. message: client data packet
     * Returns: Nothing
     */
    engine.onClientDisconnect = function(code, message) {
        // TODO
    };

    /**
     * Function: engine.handleSocketError
     * Arguments:
     *      1. error: client error
     * Returns: Nothing
     */
    engine.handleSocketError = function(error) {
        // TODO
    };

    /**
     * Function: gameserver.initialize
     * Arguments:
     *      1. wss: WS web socket server
     * Returns: Success status
     */
    module.exports.initialize = function(wss, config) {
        if (engine.initialized) {
            console.log("WARNING: Attempted to initialize the same instance of gameserver {" + engine.id + "} twice!");
            return false;
        }

        console.log("Gameserver Initializing...");

        // Initialize game engine space
        engine.id = uuid.v4();
        engine.wss = wss;
        engine.tick = 1;

        // Get engine config options
        engine.tickRate = config.get("game_engine.tick_rate");

        // Final engine config initialization
        engine.frameTime = (1 / engine.tickRate) * 1000;

        // Initialize socket connection
        engine.wss.on("connection", function(ws) {
            gameserver.onClientConnect(ws);
            ws.on("close", gameserver.onClientDisconnect);
            ws.on("message", gameserver.onClientMessage);
            ws.on("error", gameserver.handleSocketError);
        });

        // Initialize tick broadcast mechanism
        engine.tickTimer = setInterval(engine.onServerTick, engine.frameTime);

        engine.initialized = true;
        console.log("Game Server {" + engine.id + "} Initialized");
        return true;
    };

    /**
     * Function: gameserver.shutdown
     * Arguments: None
     * Returns: Success status
     */
    module.exports.shutdown = function() {
        if (!engine.initialized) {
            console.log("WARNING: Attempted to shutdown an uninitialized instance of a gameserver!");
            return false;
        }

        var engineId = engine.id;
        console.log("Gameserver {" + engineId + "} Shutting Down...");

        // TODO: Gracefully shutdown
        
        console.log("Gameserver {" + engineId + "} Shut Down");
        return true;
    }
}());