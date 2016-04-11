var uuid = require('node-uuid');
var winston = require('winston');
var logger = new winston.Logger();
var ProtoBuf = require('protobufjs');

var exports = module.exports = {};

/*-------------------*/
/* Utility Functions */
/*-------------------*/

function UidGenerator() {
    // TODO: Possible transform from UUID to 64-bit IDs?
    this.new = function generator() {
        return uuid.v4();
    };
}
var uidGenerator = new UidGenerator();

/*------------------*/
/* ProtoBuf Loaders */
/*------------------*/

var protobuilder = ProtoBuf.newBuilder();
ProtoBuf.loadProtoFile('proto/Common.proto', protobuilder);
ProtoBuf.loadProtoFile('proto/GameEvent.proto', protobuilder);
ProtoBuf.loadProtoFile('proto/GameHeartbeat.proto', protobuilder);
ProtoBuf.loadProtoFile('proto/GameObject.proto', protobuilder);
ProtoBuf.loadProtoFile('proto/Message.proto', protobuilder);
ProtoBuf.loadProtoFile('proto/ServerInfo.proto', protobuilder);
var protoroot = protobuilder.build();

var test = new protoroot.GameHeartbeat({
    Events: this.events,
    Updates: this.updates
});

/*-----------------------*/
/* Game Data Descriptors */
/*-----------------------*/

function Player(name, theme) {
    this.id = uidGenerator.new();
    this.name = name;
    this.theme = theme;
}

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

function GameFrame(tick) {
    this.tick = tick;
    this.events = [];
    this.updates = [];
    this.addEvent = function(event) {
        this.events.push(event);
    };
    this.addUpdate = function(update) {
        this.updates.push(update);
    };
    this.toHeartbeat = function() {
        return new protoroot.GameHeartbeat({
            Events: this.events,
            Updates: this.updates
        });
    };
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
engine.location = {};

/**
 * Function: engine.getFrame
 * Arguments:
 *      1. tick: Tick number of the frame to retrieve
 * Returns: Frame object if found, null if OOB
 */
engine.getFrame = function(tick) {
    var tickDiff = engine.tick - tick;
    if (tickDiff < 0 || tickDiff >= engine.frameLookbackLength) {
        return null;
    }
    return engine.frames[tick % engine.frameLookbackLength];
};

/**
 * Function: engine.simulateTick
 * Arguments:
 *      1. tick: tick number to simulate
 */
engine.simulateTick = function(tick) {
    if (tick > engine.tick ||
        (engine.tick - tick) >= engine.frameLookbackLength) {
        return;
    }

    // TODO: Simulate tick and update players, objects,
    //       and proceeding frames
    // Events: ObjectAbsorbed, ObjectDestroyed, ObjectSplit, CreateObject
};

/**
 * Function: engine.addEventToFrame
 * Arguments:
 *      1. event: GameEvent to add to frame
 */
engine.addEventToFrame = function(frame, event) {
    // TODO: Validate event

    // Process player events
    var player;
    switch (event.Payload) {
        case 'PlayerJoined':
            player = new Player(event.PlayerJoined.Name,
                event.PlayerJoined.ObjTheme);
            event.TargetObjId = player.id;
            engine.addNewPlayer(player);
            break;
        case 'PlayerLeft':
            if (!engine.players.hasOwnProperty(event.TargetObjId)) {
                logger.warn('Invalid player attempted to leave.');
                return;
            }
            player = engine.players[event.TargetObjId];
            engine.removePlayer(player);
            break;
        default:
    }

    // Add event to store
    frame.addEvent(event);
    engine.broadcastFrame.addEvent(event);
};

/**
 * Function: engine.addObjUpdateToFrame
 * Arguments:
 *      1. update: ObjUpdate to add to frame
 */
engine.addObjUpdateToFrame = function(frame, update) {
    // TODO: Validate object update
    // Add event to store
    frame.addUpdate(update);
    engine.broadcastFrame.addUpdate(update);
};

/**
 * Function: engine.onServerTick
 * Arguments: None
 */
engine.onServerTick = function() {
    // Broadcast current frame
    var payload = engine.broadcastFrame.toHeartbeat();
    var message = new protoroot.Message({
        Tick: engine.tick,
        GameHeartbeat: payload
    });
    var byteBuffer = message.encode();
    engine.wss.broadcast(byteBuffer.toBuffer(),
        { binary: true, mask: false });

    // Move to next frame
    ++engine.tick;
    engine.frames[engine.tick % engine.frameLookbackLength] =
        new GameFrame(engine.tick);
    engine.broadcastFrame = new GameFrame(engine.tick);
};

/**
 * Function: engine.addNewPlayer
 * Arguments:
 *      1. newPlayer: impl of 'Player' obj
 */
engine.addNewPlayer = function(player) {
    // TODO: Check for max players
    engine.players[player.id] = player;
    ++engine.playerCount;
};

/**
 * Function: engine.removePlayer
 * Arguments:
 *      1. player: impl of 'Player' obj to be removed
 */
engine.removePlayer = function(player) {
    // TODO: Remove possible player updates, send notification
    delete engine.players[player.id];
    --engine.playerCount;
};

/**
 * Function: engine.onClientConnect
 * Arguments:
 *      1. socket: WS connection socket
 * Returns: Nothing
 */
engine.onClientConnect = function(ws) {
    logger.debug('New client connected to server');

    // Build server info
    var serverInfo = new protoroot.ServerInfo({
        ServerId: engine.id,
        ServerName: engine.serverName,
        ServerRegion: engine.serverRegion,
        MaxPlayers: engine.maxPlayers,
        PlayerCount: engine.playerCount,
        TickRate: engine.tickRate,
        FrameLookbackLength: engine.frameLookbackLength,
        PlayerKickTimeout: engine.playerKickTimeout,
        LatCoordinate: engine.location.latitude,
        LongCoordinate: engine.location.longitude,
        LatSize: engine.location.lat_length,
        LongSize: engine.location.long_length,
    });

    // Encapsulate in message
    var message = new protoroot.Message({
        Tick: engine.tick,
        ServerInfo: serverInfo
    });

    // Convert to byte buffer and send
    var byteBuffer = message.encode();
    ws.send(byteBuffer.toBuffer(), { binary: true, mask: false });
};

/**
 * Function: engine.onClientMessage
 * Arguments:
 *      1. data: client data packet
 * Returns: Nothing
 */
engine.onClientMessage = function(data, flags) {
    // Check for binary and correct format
    if (flags.binary) {
        try {
            // Convert from binary to Message type
            var message = protoroot.Message.decode(data);
        } catch (err) {
            logger.warn('Could not decode client message.');
            return;
        }
    } else {
        logger.warn('Client message not in binary format.');
        return;
    }

    // Find related frame
    var frame = engine.getFrame(message.Tick);
    if (frame === null) {
        logger.verbose('Client message is out of frame lookback bounds.');
        return;
    }

    // Process payload
    switch (message.Payload) {
        case 'GameEvent':
            engine.addEventToFrame(frame, message.GameEvent);
            break;
        case 'GameObjUpdate':
            engine.addObjUpdateToFrame(frame, message.GameObjUpdate);
            break;
        default:
            logger.warn('Client message contains server-restricted' +
                'or unavailable message type.');
            return;
    }
};

/**
 * Function: engine.onClientDisconnect
 * Arguments:
 *      1. code: WS specification reason code
 *      2. reason: WS close reason string
 * Returns: Nothing
 */
engine.onClientDisconnect = function(code, reason) {
    logger.debug('Client closed a connection: [%d] %s', code, reason);
};

/**
 * Function: engine.handleSocketError
 * Arguments:
 *      1. error: client error
 * Returns: Nothing
 */
engine.handleSocketError = function(error) {
    logger.warn('WebSocket error: %s', error.data);
    // TODO: Remove players with fatal errors
};

/**
 * Function: gameserver.initialize
 * Arguments:
 *      1. wss: WS web socket server
 * Returns: Success status
 */
exports.initialize = function(wss, config) {
    if (engine.initialized) {
        logger.error('Attempted to initialize the same instance ' +
                    'of gameserver {' + engine.id + '} twice!');
        return false;
    }

    logger.info('Gameserver Initializing...');

    // Initialize game engine space
    engine.id = uuid.v4();
    engine.wss = wss;
    engine.broadcastFrame = new GameFrame(engine.tick);

    // Get engine config options
    engine.tickRate = config.get('game_engine.tick_rate');
    engine.serverName = config.get('server.name');
    engine.serverRegion = config.get('server.region');
    engine.maxPlayers = config.get('game_engine.max_players');
    engine.frameLookbackLength =
        config.get('game_engine.frame_lookback_length');
    engine.playerKickTimeout =
        config.get('game_engine.player_kick_timeout');
    engine.location.latitude = config.get('game_engine.location.latitude');
    engine.location.longitude = config.get('game_engine.location.longitude');
    engine.location.lat_length = config.get('game_engine.location.lat_length');
    engine.location.long_length =
        config.get('game_engine.location.long_length');

    // Final engine config initialization
    engine.frameTime = (1 / engine.tickRate) * 1000;

    // Initialize socket connection
    engine.wss.on('connection', function onConnection(ws) {
        engine.onClientConnect(ws);
        ws.on('close', engine.onClientDisconnect);
        ws.on('message', engine.onClientMessage);
        ws.on('error', engine.handleSocketError);
    });
    engine.wss.broadcast = function(data, flags) {
        wss.clients.forEach(function(client) {
            client.send(data, flags);
        });
    };

    // Initialize tick broadcast mechanism
    engine.tickTimer = setInterval(engine.onServerTick, engine.frameTime);

    engine.initialized = true;
    logger.info('Game Server {' + engine.id + '} Initialized');
    return true;
};

/**
 * Function: gameserver.shutdown
 * Arguments: None
 * Returns: Success status
 */
exports.shutdown = function() {
    if (!engine.initialized) {
        logger.error('Attempted to shutdown an uninitialized ' +
                    'instance of a gameserver!');
        return false;
    }

    var engineId = engine.id;
    logger.info('Gameserver {' + engineId + '} Shutting Down...');

    // TODO: Gracefully shutdown

    logger.info('Gameserver {' + engineId + '} Shut Down');
    return true;
};
