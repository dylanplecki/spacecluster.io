var serverInfo;
tree = new BinTree(function(a, b) { return a.id - b.id});
main = new GameObj(Math.floor((Math.random() * 1000) + 1), 100, 100, 50, 2, 100,"dude", "main", '#'+Math.floor(Math.random()*16777215).toString(16));
var t;
(function() {

	var ProtoBuf = dcodeIO.ProtoBuf;
	var protobuilder = ProtoBuf.newBuilder();
    ProtoBuf.loadProtoFile('./proto/Common.proto', protobuilder);
    ProtoBuf.loadProtoFile('./proto/GameEvent.proto', protobuilder);
    ProtoBuf.loadProtoFile("./proto/GameHeartbeat.proto", protobuilder);
    ProtoBuf.loadProtoFile("./proto/GameObject.proto", protobuilder);
    ProtoBuf.loadProtoFile("./proto/Message.proto", protobuilder);
    ProtoBuf.loadProtoFile("./proto/ServerInfo.proto", protobuilder);
    var protoroot = protobuilder.build();

	var socket = new WebSocket("ws://srv01.test.sc.plecki.net:8080");
	socket.binaryType = "arraybuffer";

	function send(msg) {
		if(socket.readyState == WebSocket.OPEN) {
			//var msg = protoroot.Message.encode(obj);
			var m = msg.toArrayBuffer();
			socket.send(m);
		}
	}

	socket.onopen = function() {
		console.log("Connected");
	};

	socket.onclose = function() {
		console.log("Disconnected");
	};

	socket.onmessage = function(evt) {
		try {
			var msg = protoroot.Message.decode(evt.data),
				which = msg.Payload;
			if (which == null) throw "ERROR";
			t = msg.Tick;
			switch (which) {
				case 'GameHeartbeat':
					//var arrayLength = Event.length;
					//for(var i = 0; i < arrayLength; i++) {
					//	
					//}
					
					var updates = msg.GameHeartbeat.Updates;
					console.log(updates);
					var updateLength = updates.length;
					for(var i = 0; i < updateLength; i++) {
						var update = updates[i];
						var state = update.ObjState;
						var obj = new GameObj(
								update.ObjId,
								state.XPos,
								state.YPos,
								state.Size,
								state.Velocity,
								state.Azimuth,
								"player",
								update.ObjId,
								'#'+Math.floor(Math.random()*16777215).toString(16)
						);
						var node = tree.find(obj);
						if(node == null) {
							tree.insert(obj)
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

				case 'ServerInfo':
					serverInfo = new SeverObj(
						msg.ServerInfo.ServerId, 
						msg.ServerInfo.ServerName, 
						msg.ServerInfo.ServerRegion, 
						msg.ServerInfo.MaxPlayers, 
						msg.ServerInfo.PlayerCount, 
						msg.ServerInfo.TickRate, 
						msg.ServerInfo.FrameLookbackLength, 
						msg.ServerInfo.PlayerKickTimeout, 
						msg.ServerInfo.LatCoordinate, 
						msg.ServerInfo.LongCoordinate, 
						msg.ServerInfo.LatSize, 
						msg.ServerInfo.LongSize);
						break;
				default:
					console.log(which);
					break;
			}
 			//console.log("Recieved: [" + msg + "]" + which + ".");
 			var ObjState = new protoroot.GameObjState(
 				new GameObjState(
 					main.x, 
 					main.y, 
 					main.size, 
 					main.velocity, 
 					main.azimuth
 				)
 			);
 			var ObjUpdate = new protoroot.GameObjUpdate(
 				main.id.toString(),
 				ObjState
 			);

 			var message = new protoroot.Message({
 				Tick: t,
 				GameObjUpdate: ObjUpdate
 			});
 			var msg = message.encode()
 			send(msg);
 			//main.id = main.id + 1;
 			//main.x = main.x + 1;
 			//main.y = main.y + 1;
 			//console.log("lit");

		} catch (err) {
			console.log(err);
		}
		
		//console.log(evt);		
	};





})();



function GameObj(id, x, y, size, velocity, azimuth, type, name, theme) {
	this.id = id;
	this.x  = x;
	this.y = y;
	this.size = size;
	this.velocity = velocity;
	this.azimuth =  azimuth;
	this.type = type;
	this.description = name;
	this.theme = theme;
}

function SeverObj(id, name, region, maxPlayers, playerCount, tickRank, frameLookbackLength, playerKickTimeout, latCoord, lonCoord, latSize, lonSize) {
	this.id = id;
	this.serverName = name;
	this.serverRegion = region;
	this.maxPlayers = maxPlayers;
	this.playerCount = playerCount;
	this.tickRank = tickRank;
	this.frameLookbackLength = frameLookbackLength;
	this.playerKickTimeout = playerKickTimeout;
	this.latCoord = latCoord;
	this.lonCoord = lonCoord;
	this.latSize = latSize;
	this.lonSize = lonSize;
}

function GameObjState(x, y, size, velocity, azimuth) {
	this.XPos = x;
	this.YPos = y;
	this.Size = size;
	this.Velocity = velocity;
	this.Azimuth = azimuth;
}

function GameObjUpdate(id, ObjState) {
	this.ObjId = id;
	this.GameObjState = ObjState;
}




