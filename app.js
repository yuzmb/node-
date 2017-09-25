var eventproxy = require('eventproxy')
var superagent = require('superagent')
var cheerio = require('cheerio')
var url = require('url')
var cnodeUrl = 'https://cnodejs.org/?tab=all&page=1'
var async = require('async')

var express = require('express')
var app = express()
var data = []
var ep = new eventproxy()
var test = 0
var concurrencyCount = 0

var fetchUrl = function (topicUrl, callback) {
  var delay = Math.floor(Math.random() * 1000 + 1)
  concurrencyCount++
  console.log('现在并发数是', concurrencyCount, ', 正在抓取的是', topicUrl, '，耗时' + delay + '毫秒')
  
  superagent.get(topicUrl)
    .end(function (err, res) {
      //console.log('fetch ' + topicUrl + ' successful')
      ep.emit('topic_html', [topicUrl, res.text])
    })

  ep.after('topic_html', 5, function (topics) {
    test++
    topics = topics.map(function (topicPair) {
      var topicUrl = topicPair[0]
      var topicHtml = topicPair[1]
      var $ = cheerio.load(topicHtml)
      return ({
        title: $('.topic_full_title').text().trim(),
        href: topicUrl,
        comment1: $('.reply_content').eq(0).text().trim()
      })
    })
    //console.log(test)
    if (test === 1) {
      test = -4
      //console.log(topics)
      data.push(topics)
    }
    setTimeout(function(){
      concurrencyCount--
      callback(null, topicUrl)
    }, delay)
  })
}

var count = 1
function start(cnodeUrl) {
  superagent.get(cnodeUrl)
    .end(function (err, res) {
      if (err) {
        return console.error(err)
      }
      var topicUrls = []
      var $ = cheerio.load(res.text)
      $('#topic_list .topic_title').each(function (index, element) {
        var href = url.resolve(cnodeUrl, $(this).attr('href'))
        topicUrls.push(href)
      })

      async.mapLimit(topicUrls, 5, function (topicUrl, callback) {
        fetchUrl(topicUrl, callback)
      }, function (err, result) {
        //访问完成的回调函数
        console.log('final:')
        //可以递归调用 获取每一页的数据
        //console.log(result)
        // if(count < 10){
        //   count++
        //   var url = 'https://cnodejs.org/?tab=all&page=' + count
        //   start(url)
        // }
      })
    })
}
start(cnodeUrl)


app.get('/', function (req, res, next) {
  res.send(data)
})
app.listen(3000)