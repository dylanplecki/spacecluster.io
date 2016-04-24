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
    this.markForDelete = false;
    this.hidden = false;
    this.lastUpdatedHrTime = process.hrtime();

    this.update = function(gameObjUpdate) {
        this.lastUpdatedTick = gameObjUpdate.Tick;
        this.dirty = true; // TODO: Check for change
        this.xPos = gameObjUpdate.ObjState.XPos;
        this.yPos = gameObjUpdate.ObjState.YPos;
        this.size = gameObjUpdate.ObjState.Size;
        this.velocity = gameObjUpdate.ObjState.Velocity;
        this.azimuth = gameObjUpdate.ObjState.Azimuth;
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
            LastUpdatedTick: this.lastUpdatedTick,
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
    this.objects = {};
    this.events = [];
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
    var protoBuilder = ProtoBuf.newBuilder();
    ProtoBuf.loadProtoFile('proto/GameEvent.proto', protoBuilder);
    ProtoBuf.loadProtoFile('proto/GameHeartbeat.proto', protoBuilder);
    ProtoBuf.loadProtoFile('proto/GameObject.proto', protoBuilder);
    ProtoBuf.loadProtoFile('proto/GameState.proto', protoBuilder);
    ProtoBuf.loadProtoFile('proto/Message.proto', protoBuilder);
    ProtoBuf.loadProtoFile('proto/ServerInfo.proto', protoBuilder);
    this.proto = protoBuilder.build().spacecluster;

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
            if (client.readyState === client.OPEN) {
                client.send(data, flags);
            } else {
                // TODO: Logging
            }
        });
    };

    // Initialize tick broadcast mechanism
    this.tickTimer = setInterval(this.onServerTick.bind(this), this.params.frameTime);

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

    // TODO: Gracefully shutdown everything
    clearInterval(this.tickTimer);
    this.wss.close();

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

    var obj = this.createObjectFromEventPayload(gameCreateEvent.CreateObject);

    gameCreateEvent.TargetObjId = obj.id;
    obj.lastUpdatedTick = gameCreateEvent.Tick;
    this.addEvent(gameCreateEvent, null, obj);
};

/**
 * Function: GameEngine.createObjectFromEventPayload
 * Arguments:
 *  1. eventCreatePayload: payload CreateObject from GameEvent
 * Returns: New object (GameObject)
 */
GameEngine.prototype.createObjectFromEventPayload = function(eventCreatePayload) {
    // TODO: Validate creation
    if (!eventCreatePayload) return null;

    var randomCentralPos = function(minPos, maxPos, radius) {
        return Math.round(minPos + ((maxPos - minPos) / 2) - radius + (Math.random() * radius * 2));
    };

    // Generate creation data for game event
    eventCreatePayload.InitialState.XPos =
        randomCentralPos(0, this.params.location.latitude, this.params.playerStartRadius);
    eventCreatePayload.InitialState.YPos =
        randomCentralPos(0, this.params.location.longitude, this.params.playerStartRadius);
    eventCreatePayload.InitialState.Velocity = 0;
    eventCreatePayload.InitialState.Azimuth = 0;
    eventCreatePayload.InitialState.Size = this.params.initialPlayerSize;

    // Create new game object and add to game engine
    var obj = new GameObject(
        this.generateUid(), // ID
        eventCreatePayload.ObjType, // Type
        eventCreatePayload.InitialState.XPos, // X pos
        eventCreatePayload.InitialState.YPos, // Y pos
        eventCreatePayload.InitialState.Velocity, // Velocity
        eventCreatePayload.InitialState.Azimuth, // Azimuth
        eventCreatePayload.InitialState.Size, // Size
        eventCreatePayload.ObjTheme, // Theme
        eventCreatePayload.Description // Description
    );

    obj.dirty = true;
    this.objects[obj.id] = obj;
    return obj;
};

/**
 * Function: GameEngine.addEvent
 * Arguments:
 *  1. gameEvent: GameEvent to add
 *  2. iniObject: initiator object reference (Optional)
 *  3. tgtObject: target object reference (Optional)
 * Returns: Nothing
 */
GameEngine.prototype.addEvent = function(gameEvent, iniObject, tgtObject) {
    gameEvent.InitObj = iniObject;
    gameEvent.TargetObj = tgtObject;

    // TODO: Validate event

    this.events.push(gameEvent);
};

/**
 * Function: GameEngine.onServerTick
 * Arguments: None
 * Returns: Nothing
 */
GameEngine.prototype.onServerTick = function() {
    var obj;
    var objId;
    var updates = [];

    // Run pre-tick-processors
    this.processEvents();
    this.generateFood();

    // Generate current state
    for (objId in this.objects) {

        if (!this.objects.hasOwnProperty(objId)) continue;
        obj = this.objects[objId];

        if (obj.markForDelete) {
            delete this.objects[objId];
        } else if (!obj.hidden && obj.dirty) {
            updates.push(obj.toGameObjUpdate(this));
            obj.dirty = false;
        }
    }

    var message = new this.proto.Message({
        GameHeartbeat: {
            SyncTick: this.tick,
            Events: this.events,
            Updates: updates
        }
    });

    // Transmit heartbeat to clients
    var byteBuffer = message.encode();
    this.wss.broadcast(byteBuffer.toBuffer(),
        { binary: true, mask: false });

    // Move to next frame
    ++this.tick;
    this.events = [];
};

/**
 * Function: GameEngine.processEvents
 * Arguments:
 *  1. eventList - list of registered events
 * Returns: Nothing
 */
GameEngine.prototype.processEvents = function() {
    var eventId, event, initiator, target, appendEvents = [];

    for (eventId in this.events) {
        if (!this.events.hasOwnProperty(eventId)) continue;
        event = this.events[eventId];

        if (event.InitObj) {
            initiator = event.InitObj;
        } else if (event.InitObjId > 0 && event.InitObjId in this.objects) {
            initiator = this.objects[event.InitObjId];
        } else {
            initiator = null;
        }

        if (event.TargetObj) {
            target = event.TargetObj;
        } else if (event.TargetObjId > 0 && event.TargetObjId in this.objects) {
            target = this.objects[event.TargetObjId];
        } else {
            target = null;
        }

        switch (event.Payload) {
            case 'ObjectDestroyed':
                assert(target);
                target.lastUpdatedHrTime = process.hrtime();

                if (target.type === 'food') {
                    target.hidden = true;
                } else {
                    target.markForDelete = true;
                }

                if (initiator) {
                    initiator.size += target.size;
                }
                break;

            case 'ObjectSplit':
                assert(target);

                for (var child in event.ObjectSplit.CreatedObjects) {
                    if (!event.ObjectSplit.CreatedObjects.hasOwnProperty(child)) continue;
                    this.createObjectFromEventPayload(child);
                }

                break;

            case 'CreateObject':
            default:
                // Do nothing
        }
    }

    if (appendEvents.length > 0) {
        Array.prototype.push.apply(this.events, appendEvents);
    }
};

/**
 * Function: GameEngine.generateFood
 * Arguments: None
 * Returns: Nothing
 */
GameEngine.prototype.generateFood = function() {
    // TODO
};

/**
 * Function: GameEngine.onClientConnect
 * Arguments:
 *      1. socket: WS connection socket
 * Returns: Nothing
 */
GameEngine.prototype.onClientConnect = function(ws) {
    var obj, objId;
    logger.debug('New client connected to server');

    // Get current state info
    var lastTick = this.tick - 1;
    var lastStates = [];

    for (objId in this.objects) {
        if (!this.objects.hasOwnProperty(objId)) continue;
        obj = this.objects[objId];

        if (!obj.hidden) {
            lastStates.push(obj.toGameObjStateExt(this));
        }
    }

    // Create new game state message
    var gameState = new this.proto.GameState({
        SyncTick: lastTick,
        ObjStates: lastStates,
        ServerInfo: {
            ServerId: this.id,
            ServerName: this.params.serverName,
            ServerRegion: this.params.serverRegion,
            MaxPlayers: this.params.maxPlayers,
            PlayerCount: this.playerCount,
            TickRate: this.params.tickRate,
            FrameLookbackLength: this.params.frameLookbackLength,
            PlayerKickTimeout: this.params.playerKickTimeout,
            LatCoordinate: this.params.location.latitude,
            LongCoordinate: this.params.location.longitude,
            LatSize: this.params.location.lat_length,
            LongSize: this.params.location.long_length
        }
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
                this.addEvent(message.GameEvent, null, null);

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
                // TODO: Validate update
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
    // TODO: Remove players who didn't send playerLeft event
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
