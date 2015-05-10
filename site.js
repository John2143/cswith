var fs = require("fs");

var createPlayer = function(ply){
	var t = [];
	t.push("<a href=\"http://steamcommunity.com/profiles/" + ply.cid + "\">")
	t.push("<td><img src=\"" + ply.summary.avatarmedium + "\" /></td>");
	t.push("<td>" + ply.name + "</td>");
	t.push("<td>" + (ply.summary.loccountrycode || "?") + "-" + (ply.summary.locstatecode || "?") + "</td>");
	t.push("<td>" + ply.bans.NumberOfGameBans + "/" + ply.bans.NumberOfVACBans + "</td>");
	t.push("<td>" + ply.bans.EconomyBan + "</td>");
	var gi = ply.gameinfo;
	t.push(
		"<td>" +
		gi.stats.total_kills + "<br>" +
		gi.stats.total_deaths + " " +
		"</td>"
	);
	t.push("<td>" + (gi.stats.total_kills/gi.stats.total_deaths).toPrecision(3) + "</td>")
	t.push(
		"<td>" +
		gi.stats.total_planted_bombs + "<br/>" +
		gi.stats.total_defused_bombs + "<br/>" +
		gi.stats.total_mvps +
		"</td>"
	);
	t.push(
		"<td>" +
		gi.stats.total_kills_ak47 + "+" + gi.stats.total_kills_m4a1 + "<br/>" +
		gi.stats.total_kills_awp + "<br/>" +
		gi.stats.total_kills_p90 + "<br/>" +
		gi.stats.total_kills_aug +
		"</td>"
	);
	t.push("<td>" + gi.stats.total_kills_headshot + " " + (gi.stats.total_kills_headshot/gi.stats.total_kills*100).toPrecision(3) + "%</td>");
	t.push("</a>");
	return t;
};

exports.createPage = function(players, supressraw){
	if(!supressraw)
		fs.writeFileSync(__dirname + "/rawplys.txt", JSON.stringify(players, null, "  "));
	var html = [];
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
	html.push("<th>AK&M4/AWP/P90/AUG</th>");
	html.push("<th>HS & HS%</th>");
	html.push("</tr>");
	for(var i in players){
		html.push("<tr>");
		var ply = players[i];
		html = html.concat(createPlayer(ply));
		html.push("</tr>");
	}
	html.push("</table>");

	fs.writeFileSync(__dirname + "/site.html", html.join(""));
};
