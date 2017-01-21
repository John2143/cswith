require("./global.js");

const http = require("http");
const watchr = require('watchr');

const countryData = JSON.parse(fs.readFileSync("./steam_countries.min.json", "utf8"));
if(!countryData) console.log("failed to load countries");

const server = http.createServer(function(req, res){
    const path = fs.readFileSync("./web/index.html");
    res.end(path);
});

const io = require("socket.io")(server);

let plys = false;

const setPlys = function(newPlys){
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

//Takes two decimal numbers (strings) and adds them
const addstring = function(a, b){
    //Result string
    let res = "";
    //carry flag
    let carry = false;

    for(let i = 1; i <= a.length; i++){
        //select the i-th (from right) char from each string
        const bchar = b[b.length - i] || 0;
        const achar = a[a.length - i];

        let sum = Number(achar) + Number(bchar);

        //if carry is set then apply it and reset
        if(carry){
            sum++;
            carry = false;
        }

        //Make sure that sum is always one digit
        if(sum >= 10){
            carry = true;
            sum = sum - 10;
        }

        //Append digit to front of string
        res = sum + res;
    }

    //If there is still a carry flag, append a 1 to the front
    if(carry) res = "1" + res;

    return res;
};

class SteamAPI{
    constructor(key, gameid){
        this.key = key;
        this.gameid = gameid;
    }

    static queryString(obj){
        let arr = [];
        for(let x of Object.keys(obj)) arr.push(`${x}=${obj[x]}`);
        return "?" + arr.join("&");
    }

    static PLtoSIDS(pl){
        return pl.plys.map(x => x.cid).join(",");
    }

    async getBans(playerList){
        const req = SteamAPI.queryString({
            key: this.key,
            steamids: SteamAPI.PLtoSIDS(playerList),
        });
        return await
            HTTPGETJSON(`http://api.steampowered.com/ISteamUser/GetPlayerBans/v1/${req}`);
    }

    async getSummaries(playerList){
        const req = SteamAPI.queryString({
            key: this.key,
            steamids: SteamAPI.PLtoSIDS(playerList),
        });
        return await
            HTTPGETJSON(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/${req}`);
    }

    async getUserStatsForGame(player){
        const req = SteamAPI.queryString({
            key: this.key,
            appid: this.gameid,
            steamid: player.cid,
        });
        return await
            HTTPGETJSON(`http://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v0002/${req}`);
    }

    async getFriendList(player){
        const req = SteamAPI.queryString({
            key: this.key,
            steamid: player.cid,
            relationship: "friend",
        });
        return await
            HTTPGETJSON(`http://api.steampowered.com/ISteamUser/GetFriendList/v0001/${req}`);
    }

}

const api = new SteamAPI(cfg.key, cfg.gameid);

class PlayerList{
    constructor(plys){
        this.plys = plys;
    }

    async getGroupStats(){
        try{
            let bans = await api.getBans(this);
            bans = bans.players;
            for(let ply of this.plys){
                for(let ban of bans){
                    if(ply.cid == ban.SteamId){
                        ply.bans = ban;
                        break;
                    }
                }
            }
        }catch(e){
            console.log(`Failed ban stats`, e);
        }

        try{
            let summaries = await api.getSummaries(this);
            summaries = summaries.response.players;
            for(let ply of this.plys){
                for(let summary of summaries){
                    if(ply.cid == summary.steamid){
                        ply.summary = summary;
                        break;
                    }
                }
            }
        }catch(e){
            console.log(`Failed summary stats`, e);
        }
    }

    async getAllStats(){
        await this.getGroupStats();
        await Promise.all(this.plys.map(ply => ply.getStats()));
        this.plys.map(ply => ply.calcLocation());
    }

    calcFriends(){
        for(let p of this.plys) p.friendsIG = new Set();

        for(let p1 of this.plys){
            for(let p2 of this.plys){
                if(p1 === p2) continue;
                for(let friend of p2.friends){
                    if(friend.cid == p1.cid){
                        p1.friendsIG.add(p2.cid);
                        p2.friendsIG.add(p1.cid);
                    }
                }
            }
        }

        for(let p of this.plys) p.friendsIG = Array.from(p.friendsIG);
    }

    calcGroup(){
        let plys = this.plys.slice();
        let groups = [];
        while(plys.length){
            let curGroup = [plys.pop()];
            let cur;
            for(let ind = 0; (cur = curGroup[ind]); ind++){
                for(let cid of cur.friendsIG){
                    for(let i in plys){
                        if(plys[i].cid === cid){
                            curGroup.push(plys[i]);
                            plys.splice(i, 1);
                        }
                    }
                }
            }
            groups.push(curGroup);
        }

        groups.sort((a, b) => b.length - a.length);

        for(let ind in groups){
            for(let ply of groups[ind]){
                let num = Number(ind);
                if(groups[ind].length === 1) num = 99;
                ply.groupid = num + 1;
            }
        }
    }

    send(){
        setPlys(this.plys);
    }
}

class Player{
    constructor(name, sid, ping){
        this.name = name;
        this.sid = sid;
        this.ping = ping;

        this.createCID();
    }

    //Create community ID from steamID
    createCID(){
        //Simulate adding two in64s, a > b
        const split = this.sid.split(":");
        const partial = Number(split[1]) + Number(split[2]) * 2;
        this.cid = addstring("76561197960265728", String(partial));
    }

    get isPrivate(){
        if(!this.summary) return;
        return this.summary.communityvisibilitystate !== 3;
    }

    async getStats(){

        this.stats = {};
        this.achievements = {};
        this.friends = [];

        if(this.isPrivate) return;

        try{
            let userstats = await api.getUserStatsForGame(this);
            const gameinfo = userstats.playerstats;

            for(let stat of gameinfo.stats){
                this.stats[stat.name] = stat.value;
            }

            for(let ach of gameinfo.achievements){
                this.achievements[ach.name] = ach.achieved;
            }
        }catch(e){
            console.log(`Stats failed for ${this.name}: ${this.sid} | ${this.cid}`, e);
        }

        try{
            let friends = await api.getFriendList(this);

            if(friends.friendslist){
                this.friends = friends.friendslist.friends.map(x => ({
                    cid: x.steamid,
                    friendSince: x.friend_since,
                }));
            }
        }catch(e){
            console.log(`Friends failed for ${this.name}: ${this.sid} | ${this.cid}`, e);
        }
    }

    calcLocation(){
        this.loc = {};
        this.coords = "0,0";
        let sum = this.summary;
        let t;

        if(!(t = countryData[sum.loccountrycode])) return;
        this.loc.country = t.name;
        this.coords = t.coordinates;

        if(!(t = t.states[sum.locstatecode])) return;
        this.loc.state = t.name;
        this.coords = t.coordinates;

        if(!(t = t.cities[sum.loccityid])) return;
        this.loc.city = t.name;
        this.coords = t.coordinates;
    }
}

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
