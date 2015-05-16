var watchr = require('watchr');
var http = require("http");
var fs = require("fs");
var cfg = require("./config.js");
var site = require("./site.js");

	//This will return:
		//0: full path
		//1: condump###
		//2: ###
var REG_TEST_PATH = /.*(condump(\d{3,}))\.txt/;

	//This will return:
		//1: Name
		//2: Steamid numbers in the form of STEAM_X:Y:ZZZZZZZZZ
		//3: ping
var REG_TEST_PLY = /#\s*\d+\s+\d+\s+"(.+)"\s+(STEAM_\d:\d:\d+)\s+\d\d:\d\d\s+(\d+)/gi;

var changeListener = function(type, path, newstat, oldstat){
	if(!(type == "update" || type == "create"))
		return;
	var pathTest = REG_TEST_PATH.exec(path);
	if (pathTest === null)
		return;


	const text = fs.readFileSync(path, {encoding: "utf-8"}) //TODO check if cstrike uses utf8
	var players = [];
	var ply;
	while((ply = REG_TEST_PLY.exec(text)) !== null){
		players.push({
			name: ply[1],
			sid: ply[2],
			ping: ply[3],
		});
	}
	createCID(players);
	getData(players, function(){ //needs to be async for speed
		site.createPage(players);
	});
};

var addnums = function(a, b){//64 bit addition emulation, a >= b
	var res = "";
	var carry = false;
	var sum;
	for(var i = 1; i <= a.length; i++){
		var bchar = (b[b.length - i] || 0);
		var achar = a[a.length - i];
		sum = Number(achar) + Number(bchar) + (carry ? 1 : 0);
		if (sum >= 10){
			carry = true;
			sum = sum - 10;
		}else{
			carry = false;
		}
		res = sum + res; //this causes a lot of shifts
	}
	res = (carry ? "1" : "") + res;
	return res;
};

var createCID = function(players, cb){
	for(var i = 0; i < players.length; i++){
		var ply = players[i];
		var split = ply.sid.split(":");
		var partial = Number(split[1]) + Number(split[2])*2;

		ply.cid = addnums("76561197960265728", String(partial));
	}
};
var getData = function(players, cb){
	var ids = [];
	for(var i in players)
		ids.push(players[i].cid);
	const req = "?key=" + cfg.key + "&steamids=" + ids.join(",");

	var reqs = 0;
	var testReqs = function(){
		if(++reqs >= 2 + players.length*2)
			cb();
	}
	GET("http://api.steampowered.com/ISteamUser/GetPlayerBans/v1/" + req, function(err, data){
		if(err){console.log("bans failed"); testReqs(); return;}
		var bans = data.players;
		for(i in bans)
			for(var v in players)
				if(players[v].cid == bans[i].SteamId)
					players[v].bans = bans[i];
		testReqs();
	});
	GET("http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/" + req, function(err, data){
		if(err){console.log("summaries failed"); testReqs(); return;}
		var bans = data.response.players;
		for(i in bans)
			for(var v in players)
				if(players[v].cid == bans[i].steamid)
					players[v].summary = bans[i];
		testReqs();
	});
	for(i in players){
		var ply = players[i];
		GET("http://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v0002/?appid=" + cfg.gameid + "&key=" + cfg.key + "&steamid=" + ply.cid, function(player, err, data){
			if(err){console.log("Stats failed for" + ply.name + "-" + ply.cid); testReqs(); return;}
			player.gameinfo = data.playerstats;
			var newStats = {};
			for(var m = 0; m < player.gameinfo.stats.length; m++)
				newStats[player.gameinfo.stats[m].name] = player.gameinfo.stats[m].value;
			player.gameinfo.stats = newStats;
			var newAch = {};
			for(var m = 0; m < player.gameinfo.achievements.length; m++)
				newAch[player.gameinfo.achievements[m].name] = player.gameinfo.achievements[m].acheived;
			player.gameinfo.achievements = newAch;

			testReqs();
		}.bind(undefined, ply));
		GET("http://api.steampowered.com/ISteamUser/GetFriendList/v0001/?relationship=friend&key=" + cfg.key + "&steamid=" + ply.cid, function(player, err, data){
			if(err){console.log("friends failed for" + ply.name + "-" + ply.cid); testReqs(); return;}
			player.friends = data.friendslist && data.friendslist.friends || [];

			for(var k in player.friends){
				var partialfriend = player.friends[k];
				for(var v in players){
					var playerfriend = players[v];
					if(partialfriend.steamid == playerfriend.cid){
						//add it to both because if someone has a private profile
						//it will still need to add them as a friend to other people
						//and vice versa
						if(player.friendsig.indexOf(playerfriend.cid) == -1)
							player.friendsig.push(playerfriend.cid)
						if(playerfriend.friendsig.indexOf(player.cid) == -1)
							playerfriend.friendsig.push(player.cid);
					}
				}
			}

			testReqs();
		}.bind(undefined, ply));
		ply.friendsig = [];
	}
};

console.log("listening on " + cfg.path);

watchr.watch({
    paths: [cfg.path, __dirname + "/testing/"],
    listeners: {change: function(a,b,c,d){
		try{
			changeListener(a,b,c,d);
		}catch(E){
			console.log(E);
		}
	}},
    next: function(err,watchers){
        if (err)
            return console.log("There was an error", err);

		console.log("Watchers are open");
		for(var i = 0; i < watchers.length; i++)
			console.log("Watcher " + i + " active");
    },
	watching: function(err, is){
		if(is)
			console.log("ayy lmao")
	},
	error: function(err){
		console.log(err)
	}
});
var GET = function(url, cb){
	return http.get(url, function(resp){
		var text = [];
		resp.on('data', function(d){
			text.push(d);
		});
		resp.setEncoding("utf-8");
		resp.on("end", function(){
			text = text.join("");
			var err = false;
			try{
				text = JSON.parse(text);
			}catch(e){
				console.log("Failed to parse json from GET, is steam down?");
				err = true
			}
			cb(err, text);
		});
		resp.on("error", function(err){
			cb(true, err);
		});
	});
};
