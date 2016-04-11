var uuid = require('node-uuid');
var winston = require('winston');
var logger = new winston.Logger();
var ProtoBuf = require('protobufjs');

var exports = module.exports = {};

/*-----------------------*/
/* Game Data Descriptors */
/*-----------------------*/

function GameObject(id, type, x, y, z, vel, azi, size) {
    if (id === null) {
        this.id = uidGenerator.new();
    } else {
        this.id = id;
    }
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

function GameEngine() {
    this.id = undefined;
    this.initialized = false;
    this.tick = 0;
    this.frames = [];
    this.playerCount = 0;
    this.params = {};
    this.proto = {};
    this.cache = {};
}

/**
 * Function: GameEngine.initialize
 * Arguments:
 *      1. wss: WS web socket server
 * Returns: Success status
 */
GameEngine.prototype.initialize = function(wss, config) {
    if (this.initialized) {
        logger.error('Attempted to initialize the same instance ' +
            'of GameEngine {' + this.id + '} twice!');
        return;
    }

    logger.info('GameEngine Initializing...');

    // Initialize game engine space
    this.id = this.generateUid();
    this.wss = wss;

    // Load the ProtoBuf
    this.proto.builder = ProtoBuf.newBuilder();
    ProtoBuf.loadProtoFile('proto/Common.proto', this.proto.builder);
    ProtoBuf.loadProtoFile('proto/GameEvent.proto', this.proto.builder);
    ProtoBuf.loadProtoFile('proto/GameHeartbeat.proto', this.proto.builder);
    ProtoBuf.loadProtoFile('proto/GameObject.proto', this.proto.builder);
    ProtoBuf.loadProtoFile('proto/Message.proto', this.proto.builder);
    ProtoBuf.loadProtoFile('proto/ServerInfo.proto', this.proto.builder);
    this.proto = this.proto.builder.build();

    // Get engine config options
    this.params.tickRate = config.get('game_engine.tick_rate');
    this.params.serverName = config.get('server.name');
    this.params.serverRegion = config.get('server.region');
    this.params.maxPlayers = config.get('game_engine.max_players');
    this.params.frameLookbackLength =
        config.get('game_engine.frame_lookback_length');
    this.params.playerKickTimeout =
        config.get('game_engine.player_kick_timeout');

    this.params.location = {};
    this.params.location.latitude = config.get('game_engine.location.latitude');
    this.params.location.longitude = config.get('game_engine.location.longitude');
    this.params.location.lat_length = config.get('game_engine.location.lat_length');
    this.params.location.long_length =
        config.get('game_engine.location.long_length');

    // Final engine config initialization
    this.params.frameTime = (1 / this.params.tickRate) * 1000;

    // Initialize socket connection
    this.wss.on('connection', function(ws) {
        this.onClientConnect(ws);
        ws.on('close', this.onClientDisconnect);
        ws.on('message', this.onClientMessage);
        ws.on('error', this.handleSocketError);
    }.bind(this));

    this.wss.broadcast = function(data, flags) {
        wss.clients.forEach(function(client) {
            client.send(data, flags);
        });
    };

    // Initialize tick broadcast mechanism
    this.tickTimer = setInterval(this.onServerTick, this.params.frameTime);

    // Build server info
    this.cache.serverInfo = new this.proto.ServerInfo({
        ServerId: this.id,
        ServerName: this.params.serverName,
        ServerRegion: this.params.serverRegion,
        MaxPlayers: this.params.maxPlayers,
        PlayerCount: this.params.playerCount,
        TickRate: this.params.tickRate,
        FrameLookbackLength: this.params.frameLookbackLength,
        PlayerKickTimeout: this.params.playerKickTimeout,
        LatCoordinate: this.params.location.latitude,
        LongCoordinate: this.params.location.longitude,
        LatSize: this.params.location.lat_length,
        LongSize: this.params.location.long_length
    });

    this.initialized = true;
    logger.info('GameEngine {' + this.id + '} Initialized');
};

/**
 * Function: GameEngine.shutdown
 * Arguments: None
 * Returns: Success status
 */
GameEngine.prototype.shutdown = function() {
    if (!this.initialized) {
        logger.error('Attempted to shutdown an uninitialized ' +
            'instance of a GameEngine!');
        return false;
    }

    var engineId = this.id;
    logger.info('GameEngine {' + engineId + '} Shutting Down...');

    // TODO: Gracefully shutdown

    logger.info('GameEngine {' + engineId + '} Shut Down');
    return true;
};

/**
 * Function: GameEngine.generateUid
 * Arguments: None
 * Returns: UID string
 */
GameEngine.prototype.generateUid = function() {
    return uuid.v4();
};

/**
 * Function: GameEngine.addEventToFrame
 * Arguments:
 *      1. event: GameEvent to add to frame
 */
GameEngine.prototype.addEventToFrame = function(frame, event) {
    // TODO: Validate event

    // Process player events
    var player;
    switch (event.Payload) {
        case 'PlayerJoined':
            player = new Player(event.PlayerJoined.Name,
                event.PlayerJoined.ObjTheme);
            event.TargetObjId = player.id;
            this.addNewPlayer(player);
            break;
        case 'PlayerLeft':
            if (!this.objects.hasOwnProperty(event.TargetObjId)) {
                logger.warn('Invalid player attempted to leave.');
                return;
            }
            player = this.objects[event.TargetObjId];
            this.removePlayer(player);
            break;
        default:
    }

    // Add event to store
    frame.addEvent(event);
    this.broadcastFrame.addEvent(event);
};

/**
 * Function: GameEngine.addObjUpdateToFrame
 * Arguments:
 *      1. update: ObjUpdate to add to frame
 */
GameEngine.prototype.addObjUpdateToFrame = function(frame, update) {
    // TODO: Validate object update
    // Add event to store
    frame.addUpdate(update);
    this.broadcastFrame.addUpdate(update);
};

/**
 * Function: GameEngine.onServerTick
 * Arguments: None
 */
GameEngine.prototype.onServerTick = function() {
    // Broadcast current frame
    var payload = this.broadcastFrame.toHeartbeat();
    var message = new this.proto.Message({
        Tick: this.tick,
        GameHeartbeat: payload
    });
    var byteBuffer = message.encode();
    this.wss.broadcast(byteBuffer.toBuffer(),
        { binary: true, mask: false });

    // Move to next frame
    ++this.tick;
    this.frames[this.tick % this.frameLookbackLength] =
        new GameFrame(this.tick);
    this.broadcastFrame = new GameFrame(this.tick);
};

/**
 * Function: GameEngine.addNewPlayer
 * Arguments:
 *      1. newPlayer: impl of 'Player' obj
 */
GameEngine.prototype.addNewPlayer = function(player) {
    // TODO: Check for max players
    this.objects[player.id] = player;
    ++this.playerCount;
};

/**
 * Function: GameEngine.removePlayer
 * Arguments:
 *      1. player: impl of 'Player' obj to be removed
 */
GameEngine.prototype.removePlayer = function(player) {
    // TODO: Remove possible player updates, send notification
    delete this.objects[player.id];
    --this.playerCount;
};

/**
 * Function: GameEngine.onClientConnect
 * Arguments:
 *      1. socket: WS connection socket
 * Returns: Nothing
 */
GameEngine.prototype.onClientConnect = function(ws) {
    logger.debug('New client connected to server');

    // Get current state info
    var lastTick = this.tick - 1;
    var lastState = undefined; // TODO

    // Create new game state message
    var gameState = new this.proto.GameState({
        SyncTick: lastTick,
        ObjStates: lastState,
        ServerInfo: this.cache.serverInfo
    });

    // Encapsulate in message
    var message = new this.proto.Message({
        Tick: this.tick,
        GameState: gameState
    });

    // Convert to byte buffer and send
    var byteBuffer = message.encode();
    ws.send(byteBuffer.toBuffer(), { binary: true, mask: false });
};

/**
 * Function: GameEngine.onClientMessage
 * Arguments:
 *      1. data: client data packet
 * Returns: Nothing
 */
GameEngine.prototype.onClientMessage = function(data, flags) {
    // Check for binary and correct format
    if (flags.binary) {
        try {
            // Convert from binary to Message type
            var message = this.proto.Message.decode(data);
        } catch (err) {
            logger.warn('Could not decode client message.');
            return;
        }
    } else {
        logger.warn('Client message not in binary format.');
        return;
    }

    // Find related frame
    var frame = this.getFrame(message.Tick);
    if (frame === null) {
        logger.verbose('Client message is out of frame lookback bounds.');
        return;
    }

    // Process payload
    switch (message.Payload) {
        case 'GameEvent':
            this.addEventToFrame(frame, message.GameEvent);
            break;
        case 'GameObjUpdate':
            this.addObjUpdateToFrame(frame, message.GameObjUpdate);
            break;
        default:
            logger.warn('Client message contains server-restricted' +
                'or unavailable message type.');
            return;
    }
};

/**
 * Function: GameEngine.onClientDisconnect
 * Arguments:
 *      1. code: WS specification reason code
 *      2. reason: WS close reason string
 * Returns: Nothing
 */
GameEngine.prototype.onClientDisconnect = function(code, reason) {
    logger.debug('Client closed a connection: [%d] %s', code, reason);
};

/**
 * Function: GameEngine.handleSocketError
 * Arguments:
 *      1. error: client error
 * Returns: Nothing
 */
GameEngine.prototype.handleSocketError = function(error) {
    logger.warn('WebSocket error: %s', error.data);
    // TODO: Remove players with fatal errors
};

// Final export
exports.GameEngine = GameEngine;
