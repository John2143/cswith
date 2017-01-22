import "./global.js";
import Player from "./Player.js";
import PlayerList from "./PlayerList.js";

import http from "http";
import watchr from "watchr";

import socketio from "socket.io";

const server = http.createServer(function(req, res){
    const path = fs.readFileSync("./web/index.html");
    res.end(path);
});

const io = socketio(server);

let plys = false;

global.setPlys = function(newPlys){
    plys = newPlys;
    fs.writeFileSync("rawplys.json", JSON.stringify(plys, (key, value) => value, 2));
    io.emit("plys", plys);
};

io.on("connection", function(socket){
    console.log("someone connected");

    socket.emit("plys", plys);

    socket.on("disconnect", function(){
        console.log("someone left");
    });
});

const onFileChange = async function(type, path){
    if(type === "delete") return;
    console.log("New file received", path);

    const condumpFile = /.*(condump(\d{3,}))\.txt/.exec(path);

    if(!condumpFile) return console.log("Not condump");

    const text = fs.readFileSync(path, {encoding: "utf-8"});
    let players = [];

    const testPly = /#\s*\d+\s+\d+\s+"(.+)"\s+(STEAM_\d:\d:\d+)\s+\d\d:\d\d\s+(\d+)/giu;

    for(let ply; (ply = testPly.exec(text)); ){
        players.push(new Player(ply[1], ply[2], ply[3]));
    }

    let playerList = new PlayerList(players);

    console.log("Players sucessfully parsed");

    await playerList.getAllStats();

    console.log("stats done");
    playerList.calcFriends();
    playerList.calcGroup();
    playerList.send();
    console.log("stats sent");
};

const stalker = watchr.open(cfg.path, onFileChange, () => console.log("watching started"));
server.listen(6969);
