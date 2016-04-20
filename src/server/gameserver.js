var uuid = require('node-uuid');
var winston = require('winston');
var logger = new winston.Logger();
var ProtoBuf = require('protobufjs');

var exports = module.exports = {};

/*-----------------------*/
/* Game Data Descriptors */
/*-----------------------*/

function GameObject(id, type, x, y, vel, azi, size,
                    theme, description) {
    // Construct new game object
    this.id = id;
    this.type = type;
    this.xPos = x;
    this.yPos = y;
    this.velocity = vel;
    this.azimuth = azi;
    this.size = size;
    this.theme = theme;
    this.description = description;
    this.isPlayer = type === "player";
    this.lastUpdatedTick = -1;
    this.dirty = false;
    this.registeredEvents = [];

    this.update = function(gameObjUpdate) {
        // TODO: Validate object update
        this.lastUpdatedTick = gameObjUpdate.Tick;
        this.dirty = true; // TODO: Check for change
        this.xPos = gameObjUpdate.ObjState.XPos;
        this.yPos = gameObjUpdate.ObjState.YPos;
        this.size = gameObjUpdate.ObjState.Size;
        this.velocity = gameObjUpdate.ObjState.Velocity;
        this.azimuth = gameObjUpdate.ObjState.Azimuth;
    };

    this.registerEvent = function(gameEvent) {
        // TODO: Validate event
        this.dirty = true;
        this.registeredEvents.push(gameEvent);
    };
    this.toGameObjState = function(gameEngine) {
        return new gameEngine.proto.GameObjState({
            XPos: this.xPos,
            YPos: this.yPos,
            Size: this.size,
            Velocity: this.velocity,
            Azimuth: this.azimuth
        });
    };

    this.toGameObjUpdate = function(gameEngine) {
        return new gameEngine.proto.GameObjUpdate({
            ObjId: this.id,
            Tick: this.lastUpdatedTick,
            ObjState: this.toGameObjState(gameEngine)
        });
    };

    this.toGameObjStateExt = function(gameEngine) {
        return new gameEngine.proto.GameObjStateExt({
            ObjId: this.id,
            ObjType: this.type,
            ObjTheme: this.theme,
            Description: this.description,
            LastUpdateTick: this.lastUpdatedTick,
            ObjState: this.toGameObjState(gameEngine)
        });
    };
}

/*----------------------------*/
/* Game Engine Implementation */
/*----------------------------*/

function GameEngine() {
    this.id = undefined;
    this.idCounter = 0;
    this.idFullRound = false;
    this.initialized = false;
    this.tick = 0;
    this.playerCount = 0;
    this.params = {};
    this.proto = {};
    this.cache = {};
    this.objects = {};
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
    this.id = uuid.v4();
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
    this.params.initialPlayerSize =
        config.get('game_engine.initial_player_size');
    this.params.playerStartRadius =
        config.get('game_engine.player_start_radius');

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
        ws.on('close', function(code, reason) {
            this.onClientDisconnect(ws, code, reason);
        }.bind(this));

        ws.on('message', function(data, flags) {
            this.onClientMessage(ws, data, flags);
        }.bind(this));

        ws.on('error', function (error) {
            this.handleSocketError(ws, error);
        }.bind(this));
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
    var uid;
    do {
        if (this.idCounter == Number.MAX_VALUE) {
            // Went full-round
            this.idFullRound = true;
            this.idCounter = 0;
        }
        uid = ++(this.idCounter);
    } while (this.idFullRound && (uid in this.objects));
    return uid;
};

/**
 * Function: GameEngine.createObjectFromEvent
 * Arguments:
 *  1. gameCreateEvent: GameEvent (payload CreateObject) to base from
 * Returns: New object (GameObject)
 */
GameEngine.prototype.createObjectFromEvent = function(gameCreateEvent) {
    // TODO: Validate creation
    if (!gameCreateEvent.CreateObject) return null;

    var randomCentralPos = function(minPos, maxPos, radius) {
        return minPos + ((maxPos - minPos) / 2) - radius + (Math.random() * radius * 2);
    };

    // Generate creation data for game event
    gameCreateEvent.TargetObjId = this.generateUid();
    gameCreateEvent.CreateObject.InitialState.XPos =
        randomCentralPos(0, this.params.location.latitude, this.params.playerStartRadius);
    gameCreateEvent.CreateObject.InitialState.YPos =
        randomCentralPos(0, this.params.location.longitude, this.params.playerStartRadius);
    gameCreateEvent.CreateObject.InitialState.Velocity = 0;
    gameCreateEvent.CreateObject.InitialState.Azimuth = 0;
    gameCreateEvent.CreateObject.InitialState.Size = this.params.initialPlayerSize;
    // TODO: Create at random position / initial size

    // Create new game object and add to game engine
    var obj = GameObj(
        gameCreateEvent.TargetObjId, // ID
        gameCreateEvent.CreateObject.ObjType, // Type
        gameCreateEvent.CreateObject.InitialState.XPos, // X pos
        gameCreateEvent.CreateObject.InitialState.YPos, // Y pos
        gameCreateEvent.CreateObject.InitialState.Velocity, // Velocity
        gameCreateEvent.CreateObject.InitialState.Azimuth, // Azimuth
        gameCreateEvent.CreateObject.InitialState.Size, // Size
        gameCreateEvent.CreateObject.ObjTheme, // Theme
        gameCreateEvent.CreateObject.Description // Description
    );

    obj.dirty = true; // Done again in registerEvent
    obj.lastUpdatedTick = gameCreateEvent.Tick;
    obj.registerEvent(gameCreateEvent);

    this.objects[obj.id] = obj;
    return obj;
};

/**
 * Function: GameEngine.onServerTick
 * Arguments: None
 * Returns: Nothing
 */
GameEngine.prototype.onServerTick = function() {
    var events = [];
    var updates = [];

    // Generate current state
    this.objects.forEach(function(obj) {
        if (obj.dirty) {
            updates.push(obj.toGameObjUpdate(this));
            Array.prototype.push.apply(events, obj.registeredEvents);
            obj.dirty = false;
            // TODO: obj.processEvents();
        }
    }.bind(this));

    var message = new this.proto.Message({
        GameHeartbeat: {
            SyncTick: this.tick,
            Events: events,
            Updates: updates
        }
    });

    // Transmit heartbeat to clients
    var byteBuffer = message.encode();
    this.wss.broadcast(byteBuffer.toBuffer(),
        { binary: true, mask: false });

    // Move to next frame
    ++this.tick;
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
    var lastStates = [];

    this.objects.forEach(function(obj) {
        lastStates.push(obj.toGameObjStateExt(this));
    }.bind(this));

    // Create new game state message
    var gameState = new this.proto.GameState({
        SyncTick: lastTick,
        ObjStates: lastStates,
        ServerInfo: this.cache.serverInfo
    });

    // Encapsulate in message
    var message = new this.proto.Message({
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
GameEngine.prototype.onClientMessage = function(ws, data, flags) {
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

    // TODO: Check tick bounds

    // Process payload
    switch (message.Payload) {
        case 'GameEvent':
            var eventObjId = message.GameEvent.TargetObjId;

            if (eventObjId in this.objects) {
                this.objects[eventObjId].update(message.GameEvent);

            } else if (message.GameEvent.Payload === 'CreateObject') {

                // Create new object
                this.createObjectFromEvent(message.GameEvent);

                // Send updated event back to client
                var byteBuffer = message.encode();
                ws.send(byteBuffer.toBuffer(), { binary: true, mask: false });

            } else {
                logger.warn('Invalid ObjectId sent in GameEvent: %s.',
                    eventObjId);
            }
            break;

        case 'GameObjUpdate':
            var objUpdateId = message.GameObjUpdate.ObjId;

            if (objUpdateId in this.objects) {
                this.objects[objUpdateId].update(message.GameObjUpdate);

            } else {
                logger.warn('Invalid ObjectId sent in GameObjUpdate: %s.',
                    objUpdateId);
            }
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
GameEngine.prototype.onClientDisconnect = function(ws, code, reason) {
    logger.debug('Client closed a connection: [%d] %s', code, reason);
};

/**
 * Function: GameEngine.handleSocketError
 * Arguments:
 *      1. error: client error
 * Returns: Nothing
 */
GameEngine.prototype.handleSocketError = function(ws, error) {
    logger.warn('WebSocket error: %s', error.data);
    // TODO: Remove players with fatal errors
};

// Final export
exports.GameEngine = GameEngine;
