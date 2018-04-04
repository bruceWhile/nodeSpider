# 10分钟使用node js进行网站的爬虫
### 使用node js10分钟开始爬虫
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

- [ ] 支持多进程
- [ ] 爬虫状态监控，错误自动恢复
- [x] 并发控制
- [x] ip代理池
- [x] log日志
- [x] 数据存储
