global.Promise = require("bluebird");
global.fs = require("fs");
global.cfg = require("../config.js");

const http = require("http");
global.HTTPGET = function(url){
    return new Promise(function(resolve, reject){
        http.get(url, function(response){
            if(response.statusCode >= 300){
                reject(new Error("Code " + response.statusCode));
                return;
            }
            response.setEncoding("utf-8");

            let body = [];
            response.on("data", data => body.push(data));
            response.on("end", function(){
                resolve(body.join(""));
            });
            response.on("error", err => reject(err));
        });
    });
};

global.HTTPGETJSON = function(url){
    return HTTPGET(url).then(res => JSON.parse(res));
};
