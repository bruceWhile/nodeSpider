var https = require('https')
var cheerio = require('cheerio');
// super ajax
var http = require('superagent');
require('superagent-proxy')(http);
var MongoClient = require('mongodb').MongoClient;
var mongo_url = "mongodb://47.52.74.205:27017";
//mongodb
var db,dbo;
MongoClient.connect(mongo_url, function(err, db) {
  if (err) throw err;
  dbo = db.db("candobear")
  db = db
})

//ip代理池
function ipProxy(currentPage = 1){
    var url = 'https://www.kuaidaili.com/free/inha/'+currentPage
    var num = 0
    http.get(url)
        .timeout({
            deadline:5000
        })
        .end((err,res) =>{
            // console.log('错误',err)
            // console.log('结论',res)
            if(res) {
                var $ = cheerio.load(res.text,{decodeEntities:false})
                $('#list table tbody tr').each(function(k,v) {
                    var ip = $(this).find('td').eq(0).html()
                    var port = $(this).find('td').eq(1).html()
                    console.log({url:ip+":"+port})
                    MongoClient.connect(mongo_url, function(err, db) {
                      if (err) throw err;
                      dbo.collection("bearkBookIp").insertOne({url:ip+":"+port}, function(err, res) {
                          if(err) throw err
                          db.close()
                      })
                    })
                })
                ipProxy(currentPage+1)
            }else{
                console.log('程序即将退出')
                process.exit()
            }
        })
}
ipProxy()

//ip代理保活
function getIp() {
    console.log('开始')
    dbo.collection("bearkBookIp").find({}).toArray(function(err, res1) {
        if(err) throw err
        console.log(res1)
        setInterval(function(){
            for(let item in res1) {
                http.get('https://book.douban.com')
                    .proxy('http://'+res1[item])
                    .timeout({
                        deadline:5000
                    })
                    .end((err1,rst) =>{
                        console.log(rst)
                        if(err1){
                            dbo.collection("bearkBookIp").deleteOne({_id:res1[item]['_id']},function(err1,res1){
                                if(err) throw error
                                console.log('删除一条')
                            })
                        }else{
                            console.log('测试成功')
                        }
                    })
            }
        },1000)
    })
}
// setTimeout(function(){
//     getIp()
// },2000)
