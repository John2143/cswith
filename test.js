var site = require("./site.js");
var fs = require("fs");
site.createPage(
	JSON.parse(fs.readFileSync("rawplys.txt")), true
);
