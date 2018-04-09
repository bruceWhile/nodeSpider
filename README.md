# 10分钟使用node js进行网站的爬虫
### 使用node js10分钟开始爬虫

## install

```javascript
git clone https://github.com/bruceWhile/nodeSpider
npm install
node index.js
```

### 1.使用的主要技术栈
------

> * node
> * cheerio
> * superagent
> * superagent-proxy
> * async
> * fs
> * mongodb

------

## 2.为什么是node
node异步回调模式可以很好的并发请求，but 并发请求一旦增大很有可能会使目标网站对我们封禁
### 3.目前状态

- [ ] bug还有一堆。逻辑仍未完善
- [ ] 支持多进程
- [ ] 爬虫状态监控，错误自动恢复
- [x] 并发控制
- [x] ip代理池
- [x] log日志
- [x] 数据存储


## 3.问题
------
> * ip代理池问题，最终原理为保活。提供以下思路，这里采取同样的爬虫方式or获取api方式，获取ip代理。然后对获取的代理ip进行活性请求。设定请求超时为5s，每5s对已获取的ip进行存活处理。
> * 爬虫中途对代理ip失效处理，爬取途中无法判断是爬取对象超时或者是代理ip超时。目前采取的一种方案为每隔1分钟循环换取代理ip。然后这样似乎并不能最大化利用代理ip
> * 针对目标网站对现有代理ip的封禁问题。暂无解决办法。
> * 爬虫是个坑，入坑需谨慎。。。。。
------
