require("./global.js");

let chai = global.chai = require("chai");
let expect = global.expect = chai.expect;

chai.use(require("chai-http"));
chai.use(require("chai-as-promised"));

chai.should();

//tests here
