var request = require("request");
var config = require("../config");
var cheerio = require("cheerio");
var fs = require("fs");
var Base64 = require("js-base64").Base64;

var cookie = null;

function start(){
    var url = config.host +"/"+config.category + "/"+config.cartoonID;
    console.log(url);
    getChapterlist(url,config.chapterListID)
    .then(function(chapterList){
        var i = config.startChapter, j = chapterList.length;
        getChapter(chapterList[77]).then(function(chapterContent){
            console.log("saving "+chapterContent.index+"话");
            save_files(chapterContent);
        },function(err){
            console.log(err);
        });
        // var intval = setInterval(function(){
        //     if(i>=j) clearInterval(intval); 
        //     var item = chapterList[i];
        //     getChapter(item).then(function(chapterContent){
        //         console.log("saving "+chapterContent.index+"话");
        //         save_files(chapterContent);
        //     },function(err){
        //         console.log(err);
        //     });
        //     i++;
        // },60000);
        // for(i=config.startChapter;i<j;i++){
        //     (function(item){
        //         setTimeout(function(){
        //             getChapter(item).then(function(chapterContent){
        //                     console.log("saving "+chapterContent.index+"话");
        //                     save_files(chapterContent);
        //             },function(err){
        //                 console.log(err);
        //             });
        //         },10000*(i+1));
        //     })(chapterList[i]);   
        // }
    },function(err){
        console.log(err);
    })
}


function getChapterlist(mainPage,chapterListId){
    return new Promise(function(reslove,reject){
        request.get(mainPage,function(err,response,body){
            if(err) {
                return reject(err);
            }
            if(!response || response.statusCode != 200){
                return reject("get chapter list failed");
            }            
            var $ = cheerio.load(body);
            var list = $("#"+chapterListId).find("ul li");
            var chapterList = [];
            var temp = null, anchor = null;
            var i = list.length;
            var count = 1;
            while(i--){
                anchor = list[i].children[0];
                temp = {};
                // temp.title = unescape(anchor.attribs.title);
                temp.index = count ++;
                temp.url = anchor.attribs.href.replace(config.pc_host,config.host).replace(/#pc/,"");
                chapterList.push(temp);
            }
            reslove(chapterList); 
        })
    })
}


function getChapter(info){
    return new Promise(function(reslove,reject){
        console.log("getting 第"+info.index+"话 imgs");
        request.get(info.url,function(err,response,body){
            if(err) return reject(err);
            if(!response || response.statusCode != 200){
                return reject("get chapter failed");
            }
            var text = body.match(/packed=.*;/);
            if(!text || !text[0]) return reject(err);
            var photosr = [];
            text = "var " + text[0];
            eval(text);
            eval(eval(Base64.decode(packed).slice(4)));
            photosr.splice(0,1);
            info.imgs = photosr;
            reslove(info);
        });       
    });
}

function save_files(chapterContent,cb) {
    var dir = "第"+chapterContent.index+"话";
    var path = config.sourceDir + "/" + dir;
    if(!fs.existsSync(path)){
        if(!fs.mkdirSync(path)){
            console.log(path);
            return ;
        }
    }
    var imgs = chapterContent.imgs || [];
    var i = 0, j = 0;
    console.log("total img:"+imgs.length);
    var length = imgs.length;
    var count = 0;
    var intval = setInterval(function(){
        if(count>=length || count >=20) clearInterval(intval);
        var url = "",filename = "";
        url = config.img_host + "/"+imgs[count];
        filename = path+"/"+(count+1)+".jpg";
        console.log("load "+dir+","+(count+1)+" img");
        request.get(url).pipe(fs.createWriteStream(filename));
        count ++;
    },4000);
    // for(i=0,j=imgs.length;i<j;i++){
    //     url = config.img_host + "/"+imgs[i];
    //     filename = path+"/"+(i+1)+".jpg";
    //     (function(index,a_url,a_filename){
    //         setTimeout(function(){
    //             console.log("load "+dir+","+index+"img");
    //             request.get(a_url).pipe(fs.createWriteStream(a_filename));
    //         },3000*(index+1));
    //     })(i,url,filename);
    // }
}



function getExtraPage(){
    var url = "http://m.chuixue.net/style/js/header.js";
    return new Promise(function(reslove,reject){
        request(url,function(err,response,body){
            console.log(response.headers);
            // console.log(body);
            reslove(response.headers["set-cookie"]);
        });
        reslove();
    })
}

function getChapterImgFirst(url,cookie){
    return new Promise(function(reslove,reject){
        request.get(url,{headers:{
            "Cookie":cookie
        }},function(err,response,body){
            if(err) return reject(err);
            if(!response ||  response.statusCode != 200){
                return reject("get "+ url +" failed!");
            }
            var $  = cheerio.load(body);
            var text = $(".manga-page").text().trim();
            console.log(text);
            var total = parseInt(text.replace(/[0-9]{1,}\//,""));
            console.log(body);
            var imgDoms = $("#manga").find("img");
            var temp = {}, img = null;
            temp.total = total || 0;
            if(imgDoms.length > 1) {
                console.log("some img lost at "+url);
            }else{
                console.log(imgDoms.length);
            }
            // console.log(response.headers["set-cookie"]);
            // console.log(imgDoms[0]);
            // temp.img = imgDoms[0].attribs.src("src");
            reslove(temp);
        })
    })
}

module.exports = {
    start : start
}
