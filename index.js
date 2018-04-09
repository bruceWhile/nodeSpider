var https = require('https')
var cheerio = require('cheerio');
var iconv = require('iconv-lite');
// super ajax
var http = require('superagent');
require('superagent-proxy')(http);
//fs
var fs = require("fs");
//async
const async = require('async');
var MongoClient = require('mongodb').MongoClient;
var mongo_url = "mongodb://localhost:27017";
var ip_data = []
//ip代理池
function ipProxy(currentPage = 1){
    var url = 'https://www.kuaidaili.com/free/inha/'+currentPage
    var num = 0
    http.get(url)
        .end((err,res) =>{
            var $ = cheerio.load(res.text,{decodeEntities:false})
            $('#list table tbody tr').each(function(k,v) {
                    var ip = $(this).find('td').eq(0).html()
                    var port = $(this).find('td').eq(1).html()
                    http.get('http://'+ip+":"+port)
                        .timeout({
                            // response: 5000,  // Wait 5 seconds for the server to start sending,
                            deadline: 10000 // but allow 1 minute for the file to finish loading.
                         })
                        .end((err1,res1) =>{
                            if(res1) {
                                if(res1.statusCode == 200){
                                    console.log('池',ip+":"+port)
                                    ip_data.push({url:ip+":"+port})
                                    console.log(ip_data.length)
                                    MongoClient.connect(mongo_url, function(err, db) {
                                      if (err) throw err;
                                      var dbo = db.db("candobear");
                                        dbo.collection("bearkBookIp").insertOne({url:ip+":"+port}, function(err, res) {
                                            if(err) throw err
                                            // console.log("文档插入成功");
                                            db.close();
                                        });
                                    });
                                }
                            }
                        })
            })
        if(ip_data.length <= 10){
            ipProxy(currentPage+1)
        }else {

        }
        })
}
ipProxy()

//标签
function mainTag(){
    var url = 'https://book.douban.com/tag/?view=cloud'
    var data = []
    var num = 0
    http.get(url)
        .end((err,res) =>{
            var $ = cheerio.load(res.text,{decodeEntities: false});
            $(".tagCol").each(function(k,v){
                var val = $('.tagCol').eq(k).find("tbody").find("tr")
                val.each(function(k1,v1){
                    var val1 = val.eq(k1).find('td')
                    val1.each(function(k2,v2){
                        var val2 = val1.eq(k2).find('a').html()
                        var val3 = val1.eq(k2).find('b').html()
                        val3 = val3.substring(1,val3.length-1);
                        console.log('success',{'name':val2,'num':val3})
                        var arg = {'name':val2,'state':1}
                        MongoClient.connect(mongo_url, function(err, db) {
                          if (err) throw err;
                          var dbo = db.db("candobear");
                            dbo.collection("bearBookTag").insertOne(arg, function(err, res) {
                                if(err) throw err
                                // console.log("文档插入成功");
                                db.close();
                            });
                        });
                        num++
                    })
                })
            })
            console.log('一共获得标签数:'+num)
            // fs.writeFileSync('./files/tag.json',JSON.stringify(data),{flag:'a',encoding:'utf-8',mode:'0666'})
        })
}

//标签主文件
// mainTag()

var call
var i = 0
function getBook(tagName,curr){
    console.log('第'+curr+'页')
    var url = "https://book.douban.com/tag/"+encodeURI(tagName)
    i_s = parseInt(i/10000)
    let proxy = 'http://'+ip_data[i_s]['ip']+":"+ip_data[i_s]['port']
    if(i_s == 20){
        getProxyIp()
        i = 0
    }
    http.get(url)
        .proxy(proxy)
        .query({start: 20*curr})
        .query({type: 'T'})
        .end(function(err,res){
            if(err){
                 call(null,'error')
                 return
            }
            var $ = cheerio.load(res.text,{decodeEntities: false})
            if($('.subject-item').length == 0) {
                call(null,'success')
                return
            }
            $('.subject-item').each(function(k,v){
                var src = $(this).find('.pic').find('a').attr('href')
                var data = {src,'state':1}
                MongoClient.connect(mongo_url, function(err, db) {
                  if (err) throw err;
                  var dbo = db.db("candobear");
                    dbo.collection("bearBookList").insertOne(data, function(err, res) {
                        if(err) throw err
                        i++
                        db.close();
                    });
                });
            })
            getBook(tagName,curr+1)
        })
}
//获取ip
function getProxyIp(){
    http.get("http://piping.mogumiao.com/proxy/api/get_ip_bs")
        .query({appKey: 'f40f8fd28ca9401a945c273011fb35ae'})
        .query({count:20})
        .query({expiryDate:0})
        .query({format:1})
        .end((err,res) =>{
            var data = JSON.parse(res.text)
            for (var item in data.msg) {
                http.get('http://www.baidu.com')
                    .proxy("http://"data.msg[item]['ip']+":"+data.msg[item]['port'])
                    .end((err,res) =>{
                        if(res.statusCode == 200) {
                            ip_data.push(data.msg[item])
                        }
                    })
            }
        })
}

function fromTagToBool(){
    getProxyIp()
    MongoClient.connect(mongo_url, function(err, db) {
        if (err) throw err;
        var dbo = db.db("candobear");
        dbo.collection("bearBookTag"). find({}).toArray(function(err, result) { // 返回集合中所有数据
            if (err) throw err;
            async.mapLimit(result,1,function(item,callback){
                console.log('当前数据',item['name'])
                getBook(item['name'],0)
                call = callback
            },function(err,res){
                console.log(err)
            })
            db.close();
        });
    });
}
fromTagToBool()


//获取书本详情
function bookDetail(url,callback){
  http.get(url)
      .end((err,res) =>{
          if(err){
            callback(null,'failed')
            return
          }
          var $ = cheerio.load(res.text,{decodeEntities: false});
          var bookName = $('#wrapper').find('h1').find('span').html()
          var bookPic = $(".nbg").attr('href')
          var other = $("#info").html()
          var rating_num = $('.rating_num').html()
          var contentIntro = $('.indent .intro').find('p').eq(0).html()
          var authorIntro = $('.indent .intro').find('p').eq(1).html()
          var data = {bookName,bookPic,author,rating_num}
          var tag = []
          $('#db-tags-section .indent span').each(function(k,v){
              tag[k] = $(this).find('a').html()
          })
          //作者
          if(other.search('作者') != -1){
              var author = other.substring(other.search("作者")+10,other.search('<br>'))
              author = author.substring(author.search('">')+2,author.search("</a>"))
              author = author.replace("\n","")
              author = author.replace("\n","")
              other = other.substring(other.search('<br>')+10)
              data['author'] = author
          }
          //出版社
          if(other.search("出版社:") != -1){
            var press = other.substring(other.search("出版社:")+12,other.search('<br>'))
            other = other.substring(other.search('<br>')+10)
            data['press'] = press
          }
          //出品方
          if(other.search('出品方:') != -1){
            var pressUser = other.substring(other.search("出品方:")+12,other.search('<br>'))
            pressUser = pressUser.substring(pressUser.search('">')+2,pressUser.search("</a>"))
            other = other.substring(other.search('<br>')+10)
            data['pressUser'] = pressUser
          }
          //副标题
          if(other.search('副标题:') != -1){
            var oTitle = other.substring(other.search("副标题:")+12,other.search('<br>'))
            other = other.substring(other.search('<br>')+10)
            data['oTitle'] = oTitle
          }
          //原作名
          if(other.search('原作名:') != -1){
            var oldName = other.substring(other.search("原作名:")+12,other.search('<br>'))
            other = other.substring(other.search('<br>')+10)
            data['oldName'] = oldName
          }
          //译者
          if(other.search('译者') != -1){
            var transUser = other.substring(other.search("译者")+12,other.search('<br>'))
            transUser = transUser.substring(transUser.search('">')+2,transUser.search("</a>"))
            other = other.substring(other.search('<br>')+10)
            data['transUser'] = transUser
          }
          //出版年
          if(other.search('出版年:') != -1){
            var pressTime = other.substring(other.search("出版年:")+12,other.search('<br>'))
            other = other.substring(other.search('<br>')+10)
            data['pressTime'] = pressTime
          }
          //页数
          if(other.search('页数:') != -1){
            var pageNum = other.substring(other.search("页数:")+11,other.search('<br>'))
            other = other.substring(other.search('<br>')+10)
            data['pageNum'] = pageNum
          }
          //定价
          if(other.search('定价:') != -1){
            var price = other.substring(other.search("定价:")+11,other.search('<br>'))
            other = other.substring(other.search('<br>')+10)
            data['price'] = price
          }
          //装帧
          if(other.search('装帧:') != -1){
            var type = other.substring(other.search("装帧:")+11,other.search('<br>'))
            other = other.substring(other.search('<br>')+10)
            data['type'] = type
          }
          //丛书
          if(other.search('丛书') != -1){
            var fromBook = other.substring(other.search("丛书")+12,other.search('<br>'))
            fromBook = fromBook.substring(fromBook.search('">')+2,fromBook.search("</a>"))
            other = other.substring(other.search('<br>')+10)
            data['fromBook'] = fromBook
          }
          //ISBN
          if(other.search('ISBN:') != -1){
            var isbn = other.substring(other.search("ISBN:")+13,other.search('<br>'))
            data['ISBN'] = isbn
          }
          data['tag'] = tag
          data['contentIntro'] = contentIntro
          data['authorIntro'] = authorIntro
          console.log(data)
          MongoClient.connect(mongo_url, function(err, db) {
            if (err) throw err;
            var dbo = db.db("candobear");
              dbo.collection("bookDetail").insertOne(data, function(err, res) {
                  if(err) throw err
                  db.close();
                  callback(null,'success')
              });
          });
      })
}

//获取书籍详情
function bookList(){
  var stream = fs.createReadStream('./files/book/J.K.罗琳.json')
  stream.setEncoding('utf8')
  chunk = ''
  stream.on('data',function(res){
    chunk += res
  })
  stream.on('end',function(){
    chunk = JSON.parse(chunk)
    async.mapLimit(chunk,1,function(url,callback){
        console.log('当前数据',url)
        bookDetail(url['src'],callback)
    },function(err,res){
        console(err)
    })
  })
}
// bookList()
