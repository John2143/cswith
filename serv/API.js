import {getJson} from "./util.js";

export default class SteamAPI{
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
            getJson(`http://api.steampowered.com/ISteamUser/GetPlayerBans/v1/${req}`);
    }

    async getSummaries(playerList){
        const req = SteamAPI.queryString({
            key: this.key,
            steamids: SteamAPI.PLtoSIDS(playerList),
        });
        return await
            getJson(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/${req}`);
    }

    async getUserStatsForGame(player){
        const req = SteamAPI.queryString({
            key: this.key,
            appid: this.gameid,
            steamid: player.cid,
        });
        return await
            getJson(`http://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v0002/${req}`);
    }

    async getFriendList(player){
        const req = SteamAPI.queryString({
            key: this.key,
            steamid: player.cid,
            relationship: "friend",
        });
        return await
            getJson(`http://api.steampowered.com/ISteamUser/GetFriendList/v0001/${req}`);
    }
}
