import http from "http";

//Takes two decimal numbers (strings) and adds them
export const addstring = function(a, b){
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

export const get = function(url){
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

export const getJson = function(url){
    return get(url).then(res => JSON.parse(res));
};
