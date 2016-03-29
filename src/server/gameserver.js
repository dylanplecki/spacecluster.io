var uuid = require("node-uuid");
var protobuf = require("protobufjs");

(function() {
    
    /*-------------------*/
    /* Utility Functions */
    /*-------------------*/
    
    function UidGenerator() {
        this.counter = 0;
        this.maxId = 4294967295;
        this.new = function() {
            return (this.counter++ % this.maxId) + 1;
        }
    }
    var uidGenerator = new UidGenerator();
    
    /*------------------*/
    /* Protobuf Loaders */
    /*------------------*/
    
    var protobuilder = protobuf.newBuilder();
    protobuf.loadProtoFile("proto/Common.proto", protobuilder);
    protobuf.loadProtoFile("proto/GameEvent.proto", protobuilder);
    protobuf.loadProtoFile("proto/GameHeartbeat.proto", protobuilder);
    protobuf.loadProtoFile("proto/GameObject.proto", protobuilder);
    protobuf.loadProtoFile("proto/Message.proto", protobuilder);
    protobuf.loadProtoFile("proto/ServerInfo.proto", protobuilder);
    var protoroot = protobuilder.build();

    /*-----------------------*/
    /* Game Data Descriptors */
    /*-----------------------*/

    function Player(name, theme, ip) {
        this.id = uidGenerator.new();
        this.name = name;
        this.theme = theme;
        this.ipAddress = ip;
    }

    function GameObject(id, type, x, y, z, vel, azi, size) {
        if (id === null) {
            id = uidGenerator.new();
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
    
    function GameFrame(tick) {
        this.tick = tick;
        this.events = [];
        this.updates = [];
        this.addEvent = function(event) {
            
        }
        this.addUpdate = function(update) {
            
        }
    }

    /*----------------------------*/
    /* Game Engine Implementation */
    /*----------------------------*/

    var engine = {};
    engine.initialized = false;
    
    engine.tick = 0;
    engine.frames = [];
    engine.players = {};
    engine.objects = {};
    engine.playerCount = 0;
    
    /**
     * Function: engine.simulateFrame
     * Arguments:
     *      1. frame: GameFrame impl to simulate
     */
    engine.simulateFrame = function(frame) {
        // TODO
    };
    
    /**
     * Function: engine.addEventToFrame
     * Arguments:
     *      1. event: GameEvent to add to frame
     */
    engine.addEventToFrame = function(event) {
        // TODO
    };

    /**
     * Function: engine.addNewPlayer
     * Arguments:
     *      1. newPlayer: impl of 'Player' obj
     */
    engine.addNewPlayer = function(newPlayer) {
        engine.players[newPlayer.id] = newPlayer;
        ++engine.playerCount;

        // Broadcast player join to network
        var playerJoinPayload = new protoroot.PlayerJoinedPayload({
            "Name": newPlayer.name,
            "ObjTheme": newPlayer.theme
        });
        var playerJoin = new protoroot.GameEvent({
            "Tick": engine.tick,
            "Type": engine.tick,
            "InitObjId": engine.tick,
            "TargetObjId": engine.tick,
            "PlayerJoined": playerJoinPayload
        });
        engine.addEventToFrame(playerJoin);
    };
    
    /**
     * Function: engine.removePlayer
     * Arguments:
     *      1. player: impl of 'Player' obj to be removed
     */
    engine.removePlayer = function(player) {
        // TODO
    };

    /**
     * Function: engine.onServerTick
     * Arguments: None
     */
    engine.onServerTick = function() {
        var frame = engine.frames[engine.tick % engine.frameLookbackLength];
        engine.simulateFrame();
        ++engine.tick;
    };

    /**
     * Function: engine.onClientConnect
     * Arguments:
     *      1. socket: WS connection socket
     * Returns: Nothing
     */
    engine.onClientConnect = function (ws) {
        // Send server info
        var serverInfo = new protoroot.ServerInfo({
            "ServerId": engine.id,
            "ServerName": engine.serverName,
            "ServerRegion": engine.serverRegion,
            "MaxPlayers": engine.maxPlayers,
            "PlayerCount": engine.playerCount,
            "TickRate": engine.tickRate,
            "FrameLookbackLength": engine.frameLookbackLength,
            "PlayerKickTimeout": engine.playerKickTimeout
        });
        var message = new protoroot.Message({
            "ServerInfo": serverInfo
        });
        var byteBuffer = message.encode();
        ws.send(byteBuffer.toBuffer(), { binary: true, mask: true });
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
            console.log("WARNING: Attempted to initialize the same instance " +
                        "of gameserver {" + engine.id + "} twice!");
            return false;
        }

        console.log("Gameserver Initializing...");

        // Initialize game engine space
        engine.id = uuid.v4();
        engine.wss = wss;

        // Get engine config options
        engine.tickRate = config.get("game_engine.tick_rate");
        engine.serverName = config.get("game_engine.server_name");
        engine.serverRegion = config.get("game_engine.server_region");
        engine.maxPlayers = config.get("game_engine.max_players");
        engine.frameLookbackLength =
            config.get("game_engine.frame_lookback_length");
        engine.playerKickTimeout =
            config.get("game_engine.player_kick_timeout");

        // Final engine config initialization
        engine.frameTime = (1 / engine.tickRate) * 1000;

        // Initialize socket connection
        engine.wss.on("connection", function(ws) {
            gameserver.onClientConnect(ws);
            ws.on("close", gameserver.onClientDisconnect);
            ws.on("message", gameserver.onClientMessage);
            ws.on("error", gameserver.handleSocketError);
        });
        wss.broadcast = function(data, flags) {
            wss.clients.forEach(function(client) {
                client.send(data, flags);
            });
        };

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
            console.log("WARNING: Attempted to shutdown an uninitialized " +
                        "instance of a gameserver!");
            return false;
        }

        var engineId = engine.id;
        console.log("Gameserver {" + engineId + "} Shutting Down...");

        // TODO: Gracefully shutdown
        
        console.log("Gameserver {" + engineId + "} Shut Down");
        return true;
    }
}());