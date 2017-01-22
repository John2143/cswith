import api from "./configAPI";

export default class PlayerList{
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
