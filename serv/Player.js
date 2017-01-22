import {addstring} from "./util.js";
import api from "./configAPI.js";

const countryData = JSON.parse(fs.readFileSync("./steam_countries.min.json", "utf8"));
if(!countryData) console.log("failed to load countries");

export default class Player{
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
