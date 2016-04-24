var serverInfo;
tree = new BinTree(function (a, b) {
    return a.id - b.id
});
main = new GameObj(Math.floor((Math.random() * 1000) + 1), 100, 100, 50, 2, 100, "dude", "main", '#' + Math.floor(Math.random() * 16777215).toString(16), 0);
var t = 0;

(function () {
    var tps = 0;
    var tps_last = Date.now();

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

    // TPS logging
    //setInterval(function () {
    //    if (settings.log_tps) {
    //        var time = Date.now() - tps_last;
    //        console.log("TPS [%f]: %d", time / 1000, tps);
    //        tps_last = Date.now();
    //        tps = 0;

    //}, 1000);

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
            var tick = 0;
            switch (which) {
                case 'GameState':
                    console.log(msg.GameState);
                    serverInfo = msg.GameState.ServerInfo;
                    var t = msg.SyncTick;
                    var objStatesLength = msg.GameState.ObjStates.length;
                    for(var k = 0; k < objStatesLength; k++) {
                        var newObjState = msg.GameState.ObjStates[k];
                        var newObj = new GameObj(newObjState.ObjId,
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
                        ObjTheme:  Math.floor(Math.random() * 16777215).toString(16),
                        Description: "player1",
                        InitialState: initState
                    });

                    var gmEvent = new protoroot.GameEvent({
                        Tick: t+1,
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
                    //if (settings.log_tps) ++tps;
                    var events = msg.GameHeartbeat.Events;
                    var eventsLength = events.length;
                    for(var j = 0; j < eventsLength; j++) {
                        var event = events[j];
                        var type = events[j].Payload;
                        switch(type) {
                            case 'ObjectDestroyedPayload':
                            case 'ObjectAbsorbedPayload':

                                var obj = {
                                    id: event.TargetObjId
                                };

                                //update to do animation!
                                tree.remove(obj);
                                break;
                            case 'CreateObjectPayload':
                                var createObj = event.CreateObject;
                                var node = new GameObj(
                                    createObj.TargetObjId,
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
                                tree.insert(node);
                                break;
                        }
                    }
                    var updates = msg.GameHeartbeat.Updates;
                    //console.log(updates);
                    var updateLength = updates.length;
                    for (var i = 0; i < updateLength; i++) {
                        var update = updates[i];
                        var state = update.ObjState;
                        var obj = {
                            id: update.ObjId
                        };
                        if (obj.id == main.id) break;
                        var node = tree.find(obj);
                        if (node == null) {
                            break;
                            //tree.insert(obj)
                        } else {
                            node.x = obj.x;
                            node.y = obj.y;
                            node.size = obj.size;
                            node.velocity = obj.velocity;
                            node.azimuth = obj.azimuth;
                        }
                    }
                    //console.log(obj);
                    break;

                case 'GameEvent':
                    console.log("yee");
                    var event = msg.GameEvent;
                    main = new GameObj(
                        event.TargetObjId,
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
                    break;

                default:
                    break;
            }
            var ObjState = new protoroot.GameObjState(
                main.x,
                main.y,
                main.size,
                main.velocity,
                main.azimuth
            );
            var ObjUpdate = new protoroot.GameObjUpdate({
                Tick: t+1,
                ObjId: main.id,
                ObjState: ObjState
            });

            var message = new protoroot.Message({
                GameObjUpdate: ObjUpdate
            });
            var new_msg = message.encode();
            send(new_msg);

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
    this.lstTick = tick;

}


