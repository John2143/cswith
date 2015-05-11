var fs = require("fs");
var lib = require("./lib.js");

var createWarn = function(pct, a, b, side){//side == false = fade out
	var clampct = lib.clamp(pct, 0, 1);
	return"<td style=\"background-color: " +
		lib.color.lerp(
			new lib.color(a || 0xff0000),
			new lib.color(b || 0x0000ff),
			pct
		).RGB(side ? clampct : 1-clampct) +
	"\">";
};

var createPlayer = function(ply){
	var t = [];
	t.push("<td><img src=\"" + ply.summary.avatarmedium + "\" /></td>");
	t.push("<td><a href=\"http://steamcommunity.com/profiles/" + ply.cid + "\">" + ply.name + "</a></td>");
	t.push("<td>" + (ply.summary.loccountrycode || "?") + "-" + (ply.summary.locstatecode || "?") + "</td>");
	t.push(
		"<td class=" +
		((ply.bans.NumberOfGameBans + ply.bans.NumberOfVACBans) > 0 ? "hasban" : "noban") +
		">" + ply.bans.NumberOfGameBans + "/" + ply.bans.NumberOfVACBans + "</td>");

	t.push("<td>" + ply.bans.EconomyBan + "</td>");

	var gi = ply.gameinfo;
	if(gi){
		var kills, deaths, headshots;
		kills     = gi.stats.total_kills;
		deaths    = gi.stats.total_deaths;
		headshots = gi.stats.total_kills_headshot;

		t.push(
			"<td>" +
			kills+ "<br>" +
			deaths + " " +
			"</td>"
		);
		var kdr = (kills/deaths);
		t.push(createWarn((kdr-1.25)/2, null, null, true) + kdr.toPrecision(3) + "</td>"); //z 1.25 = faded
		t.push(
			"<td>" +
			gi.stats.total_planted_bombs + "<br/>" +
			gi.stats.total_defused_bombs + "<br/>" +
			gi.stats.total_mvps +
			"</td>"
		);
		var ak, m4, awp, p90, deagle, fiveseven;
		ak        = gi.stats.total_kills_ak47;
		m4        = gi.stats.total_kills_m4a1;
		awp       = gi.stats.total_kills_awp;
		p90       = gi.stats.total_kills_p90;
		aug       = gi.stats.total_kills_aug;
		deagle    = gi.stats.total_kills_deagle;
		fiveseven = gi.stats.total_kills_fiveseven;

		t.push(
			"<td>" +
			ak + "+" + m4 + " (" + ((ak+m4)*100/kills).toPrecision(2) + "%)<br/>" +
			awp + " (" + (awp*100/kills).toPrecision(2) + "%)<br/>" +
			p90 + " (" + (p90*100/kills).toPrecision(2) + "%)<br/>" +
			deagle + "+" + fiveseven + " (" + ((deagle+fiveseven)*100/kills).toPrecision(2) + "%)" +
			"</td>"
		);
		var prefrence = "Unknown";
		if (awp/kills > .10)
			prefrence = "Awper";
		if((ak+m4)/kills > .35)
			prefrence = "Rifler";
		if(p90/kills > .2)
			prefrence = "P90";
		if((deagle+fiveseven)/kills > .1)
			prefrence = "Pistols";

		t.push("<td>" + prefrence + "</td>");
		var hsp = (headshots/kills);
		t.push(createWarn((hsp-.4)*(1/.4), 0x00ffff, 0xff0000, true) + headshots + "<br>" + (hsp*100).toPrecision(3) + "%</td>"); //.4 = faded, 1=red
		var playtime = gi.stats.total_time_played;
		const hours = Math.floor(playtime/3600);
		playtime = playtime%3600;
		const minutes = Math.floor(playtime/60);
		playtime = playtime%60;

		t.push(createWarn(hours/100) + hours + "h" + minutes + "m" + playtime + "s</td>");//0 = red, 100 = faded
	}else{
		t.push("<td colspan = 99 class = \"privateprof\"><center>Private</center></td>");
	}
	return t;
};

exports.createPage = function(players, supressraw){
	if(!supressraw)
		fs.writeFileSync(__dirname + "/rawplys.txt", JSON.stringify(players, null, "  "));
	var html = ["<html><head>"];

	html.push("<link rel=\"stylesheet\" type=\"text/css\" href=\"./site.css\">");

	html.push("</head><body>");
	html.push("<table id=\"players\" border>");
	html.push("<tr>");
	html.push("<th>Avatar</th>");
	html.push("<th>Name</th>");
	html.push("<th>Location</th>");
	html.push("<th>Game/VAC bans</th>");
	html.push("<th>Economy bans</th>");
	html.push("<th>K/D</th>");
	html.push("<th>KDR</th>");
	html.push("<th>P/D/MVP*</th>");
	html.push("<th>AK&M4/AWP/P90/DEAG&57</th>");
	html.push("<th>Prefrence</th>");
	html.push("<th>HS/HS%</th>");
	html.push("<th>Playtime</th>");
	html.push("</tr>");
	for(var i in players){
		html.push("<tr>");
		var ply = players[i];
		html = html.concat(createPlayer(ply));
		html.push("</tr>");
	}
	html.push("</table>");
	html.push("</body></html>");

	fs.writeFileSync(__dirname + "/site.html", html.join(""));
};
