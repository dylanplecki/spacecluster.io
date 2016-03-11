(function() {
    var engine = {};
    engine.initialized = false;

    /**
     * Function: engine.onServerTick
     * Arguments: None
     */
    engine.onServerTick = function() {
        // TODO
    };

    /**
     * Function: engine.onClientConnect
     * Arguments:
     *      1. socket: socket.io connection socket
     * Returns: Nothing
     */
    engine.onClientConnect = function(socket) {
        // TODO
    };

    /**
     * Function: engine.onClientUpdate
     * Arguments:
     *      1. data: socket.io client data packet
     * Returns: Nothing
     */
    engine.onClientUpdate = function(data) {
        // TODO
    };

    /**
     * Function: engine.onClientDisconnect
     * Arguments: None
     * Returns: Nothing
     */
    engine.onClientDisconnect = function() {
        // TODO
    };

    /**
     * Function: gameserver.initialize
     * Arguments:
     *      1. gameio: socket.io namespace
     * Returns: Success status
     */
    module.exports.initialize = function (gameio) {
        if (engine.initialized) {
            console.log("WARNING: Attempted to initialize the" +
                "same instance of gameserver twice!");
            return false;
        }

        console.log("Gameserver initializing...");
        
        // Initialize game engine space
        engine.io = gameio;
                                                                                                                       
        // Initialize socket connection
        gameio.on("connection", function(socket) {
            gameserver.onClientConnect(socket);
            socket.on("disconnect", gameserver.onClientDisconnect);
            socket.on("client_data", gameserver.onClientUpdate);
        });

        engine.initialized = true;
        console.log("Gameserver initialized");
        return true;
    };

}());