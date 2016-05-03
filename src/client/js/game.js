var serverInfo;
tree = new BinTree(function (a, b) {
    return a.id - b.id;
});

//main = new GameObj(Math.floor((Math.random() * 1000) + 1), 100, 100, 50, 2, 100, "dude", "main", '#' + Math.floor(Math.random() * 16777215).toString(16), 0);


// For statistics logging
var stat_tps = 0, stat_fps = 0;

(function () {

    var ProtoBuf = dcodeIO.ProtoBuf;
    var protobuilder = ProtoBuf.newBuilder();
    ProtoBuf.loadProtoFile('proto/GameEvent.proto', protobuilder);
    ProtoBuf.loadProtoFile("proto/GameHeartbeat.proto", protobuilder);
    ProtoBuf.loadProtoFile("proto/GameObject.proto", protobuilder);
    ProtoBuf.loadProtoFile("proto/GameState.proto", protobuilder);
    ProtoBuf.loadProtoFile("proto/Message.proto", protobuilder);
    ProtoBuf.loadProtoFile("proto/ServerInfo.proto", protobuilder);
    var protoroot = protobuilder.build().spacecluster;

    var socket = new WebSocket("ws://" + location.hostname + (location.port ? ':' + location.port : ''));
    socket.binaryType = "arraybuffer";

    // Statistics logging
    var stat_last = Date.now();
    setInterval(function () {
        if (settings.log_statistics) {
            var time = (Date.now() - stat_last) / 1000;
            //console.log("STAT [%s]: tps=%s, fps=%s", time.toFixed(2),
             //   (stat_tps / time).toFixed(2), (stat_fps / time).toFixed(2));
            stat_last = Date.now();
            stat_tps = 0; stat_fps = 0;
        }
    }, settings.logging_interval);

    function send(msg) {
        if (socket.readyState == WebSocket.OPEN) {
            var m = msg.toArrayBuffer();
            socket.send(m);
        }
    }

    socket.onopen = function () {
        console.log("Connected");
    };

    socket.onclose = function () {
        console.log("Disconnected");
    };

    socket.onmessage = function (evt) {
        try {

            var msg = protoroot.Message.decode(evt.data),
                which = msg.Payload;
            if (which == null) throw "ERROR";
            //var tick = 0;
            switch (which) {
                case 'GameState':
                    //console.log(msg.GameState);
                    serverInfo = msg.GameState.ServerInfo;
                    currentTick = msg.SyncTick + 1;
                    var objStatesLength = msg.GameState.ObjStates.length;
                    for(var k = 0; k < objStatesLength; k++) {
                        var newObjState = msg.GameState.ObjStates[k];
                        var newObj = new GameObj(newObjState.ObjId.toNumber(),
                                                 newObjState.ObjState.XPos,
                                                 newObjState.ObjState.YPos,
                                                 newObjState.ObjState.Size,
                                                 newObjState.ObjState.Velocity,
                                                 newObjState.ObjState.Azimuth,
                                                 newObjState.ObjType,
                                                 newObjState.Description,
                                                 newObjState.ObjTheme,
                                                 newObjState.LastUpdatedTick);
                        tree.insert(newObj);
                        game_objects[newObj.id] = newObj;
                    }

                    var initState = new protoroot.GameObjState({
                        XPos: 5,
                        YPos: 5,
                        Size: 5,
                        Velocity: 0.5,
                        Azimuth: .7
                    });

                    var createdObj = new protoroot.CreateObjectPayload({
                        ObjType: "player",
                        ObjTheme:  "#00FFFF",
                        Description: "player1",
                        InitialState: initState
                    });

                    var gmEvent = new protoroot.GameEvent({
                        Tick: currentTick,
                        InitObjId: 0,
                        TargetObjId: 0,
                        CreateObject: createdObj
                    });

                    var message = new protoroot.Message({
                        GameEvent: gmEvent
                    });
                    var new_msg = message.encode();
                    send(new_msg);



                    break;

                case 'GameHeartbeat':
                    if (settings.log_statistics) ++stat_tps;
                    var events = msg.GameHeartbeat.Events;
                    //console.log(msg.GameHeartbeat);
                    currentTick = msg.GameHeartbeat.SyncTick + 1;
                    var eventsLength = events.length;
                    for(var j = 0; j < eventsLength; j++) {
                        var event = events[j];
                        var type = events[j].Payload;
                        switch(type) {
                            case 'ObjectDestroyed':

                                var obj = {
                                    id: event.TargetObjId.toNumber()
                                };

                                //update to do animation!
                                tree.remove(obj);
                                delete game_objects[obj.id];
                                break;
                            case 'CreateObject':
                                //console.log("player joined");
                                //console.log(event.CreateObject)
                                var createObj = event.CreateObject;
                                var node = new GameObj(
                                    event.TargetObjId.toNumber(),
                                    createObj.InitialState.XPos,
                                    createObj.InitialState.YPos,
                                    createObj.InitialState.Size,
                                    createObj.InitialState.Velocity,
                                    createObj.InitialState.Azimuth,
                                    createObj.ObjType,
                                    createObj.Description,
                                    createObj.ObjTheme,
                                    event.Tick

                                );
                                if (node.id == main.id) {break;}
                                tree.insert(node);
                                game_objects[node.id] = node;
                                break;
                        }
                    }
                    var updates = msg.GameHeartbeat.Updates;
                    //console.log(updates);
                    var updateLength = updates.length;
                    //console.log(updates);
                    //console.log(tree);
                    for (var i = 0; i < updateLength; i++) {
                        var update = updates[i];
                        var state = update.ObjState;
                        var obj = {
                            id: update.ObjId.toNumber(),
                            x: state.XPos,
                            y: state.YPos,
                            size: state.Size,
                            velocity: state.Velocity,
                            azimuth: state.Azimuth
                        };

                        var temp_node = game_objects[obj.id];
                        if (obj.id == main.id) {
                            //console.log("same id as main");
                        } else if (temp_node == null) {
                            console.log("node is null");
                            //tree.insert(obj)
                        } else {
                            //console.log(node);
                            temp_node.x = obj.x;
                            temp_node.y = obj.y;
                            temp_node.size = obj.size;
                            temp_node.velocity = obj.velocity;
                            temp_node.azimuth = obj.azimuth;
                            game_objects[obj.id] = temp_node;
                            console.log(game_objects[temp_node.id].x);

                        }
                    }
                    var ObjState = new protoroot.GameObjState(
                        main.x,
                        main.y,
                        main.size,
                        main.velocity,
                        main.azimuth
                    );
                    var ObjUpdate = new protoroot.GameObjUpdate({
                        Tick: currentTick+1,
                        ObjId: main.id,
                        ObjState: ObjState
                    });

                    var message = new protoroot.Message({
                        GameObjUpdate: ObjUpdate
                    });
                    var new_msg = message.encode();
                    send(new_msg);
                    //console.log(obj);
                    break;

                case 'GameEvent':
                    var event = msg.GameEvent;

                    //console.log(event.CreateObject.InitialState.XPos);
                    //console.log(event.CreateObject.InitialState.YPos);
                    
                    main = new GameObj(
                        event.TargetObjId.toNumber(),
                        event.CreateObject.InitialState.XPos,
                        event.CreateObject.InitialState.YPos,
                        event.CreateObject.InitialState.Size,
                        event.CreateObject.InitialState.Velocity,
                        event.CreateObject.InitialState.Azimuth,
                        event.CreateObject.ObjType,
                        event.CreateObject.Description,
                        event.CreateObject.ObjTheme,
                        event.Tick
                    );
                    var ObjState = new protoroot.GameObjState(
                        main.x,
                        main.y,
                        main.size,
                        main.velocity,
                        main.azimuth
                    );
                    var ObjUpdate = new protoroot.GameObjUpdate({
                        Tick: currentTick,
                        ObjId: main.id,
                        ObjState: ObjState
                    });

                    var message = new protoroot.Message({
                        GameObjUpdate: ObjUpdate
                    });
                    var new_msg = message.encode();
                    send(new_msg);
                    break;

                default:
                    break;
            }
            for(var m = 0; m < peopleEaten.length; m++) {

                var eatenObj = new protoroot.ObjectDestroyedPayload({
                    DestroyReason: "Eaten!"
                });

                var destroyedGameEvent = new protoroot.GameEvent({
                    Tick: currentTick,
                    InitObjId: main.id,
                    TargetObjId: peopleEaten[m],
                    ObjectDestroyed: eatenObj
                });

                var message = new protoroot.Message({
                    GameEvent: destroyedGameEvent
                });

                var new_msg = message.encode();
                send(new_msg);
            }

        } catch (err) {
           console.log(err);
        }

    };
})();

function GameObj(id, x, y, size, velocity, azimuth, type, name, theme, tick) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.size = size;
    this.velocity = velocity;
    this.azimuth = azimuth;
    this.type = type;
    this.description = name;
    this.theme = theme;
    this.lastTick = tick;

}


