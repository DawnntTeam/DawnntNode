// TODO:对进行高级别的封装直接返回json而不是使用方法封装
const db = require('./db')
const config = require('./config')
const request = require('co-request')
const appid = config.getWechatConfig().appid
const secret = config.getWechatConfig().secret
var exports = {}

exports.getAccessToken = function * (code) {
  var apiUrl = 'https://api.weixin.qq.com/sns/oauth2/access_token?appid=' + appid + '&secret=' + secret + '&code=' + code + '&grant_type=authorization_code'
  var data = yield request({
    method: 'GET',
    url: apiUrl
  })
  return JSON.parse(data.body)
}

exports.getUserInfo = function * (access_token, openid) {
  var apiUrl = 'https://api.weixin.qq.com/sns/userinfo?access_token=' + access_token + '&openid=' + openid + '&lang=zh_CN'
  var data = yield request({
    method: 'GET',
    url: apiUrl
  })
  return JSON.parse(data.body)
}

exports.getCGIAccessToken = function * () {
  var apiUrl = 'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=' + appid + '&secret=' + secret + '&grant_type=authorization_code'
  var data = yield request({
    method: 'GET',
    url: apiUrl
  })
  return JSON.parse(data.body)
}

exports.getTicket = function * () {
  var ticket = yield db.MemoryCache.find({ where: { key: 'wechatTicket' } })
  var nowDate = new Date().getTime()
  if (ticket === null || ticket.dataValues.expires.getTime() < nowDate) {
    var token = yield exports.getCGIAccessToken()
    var apiUrl = 'https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=' + token.access_token + '&type=jsapi'
    var data = yield request({
      method: 'GET',
      url: apiUrl
    })
    ticket.value = JSON.parse(data.body).ticket
    ticket.expries = new Date().getTime() + (6600 * 1000)
    // 过期时间设置为1小时50分钟
    // TODO:需要添加lock来防止多个线程重复调用的问题
    yield ticket.save()
    ticket = JSON.parse(data.body).ticket
  } else {
    ticket = ticket.dataValues.value
  }
  return ticket
}

exports.login = function * () {
  var accessToken = yield exports.getAccessToken(this.query.code)
  if (accessToken.errcode !== undefined) {
    this.throw400(accessToken.errcode)
  }

  var openUser = yield exports.getUserInfo(accessToken.access_token, accessToken.openid)
  if (openUser.errcode !== undefined) {
    this.throw400(openUser.errcode)
  }

  var wechatUser = yield db.WechatUser.find({ where: { openid: accessToken.openid } })
  var user
  if (wechatUser != null) {
    user = yield db.User.findById(wechatUser.id)

    user.name = openUser.nickname,
    user.sex = getOpenUserSex(openUser.sex),
    user.head = openUser.headimgurl
    user.save()

    wechatUser.accessToken = accessToken.access_token
    wechatUser.refresToken = accessToken.refresh_token
    wechatUser.save()
  } else {
    user = yield db.User.create({
      name: openUser.nickname,
      sex: getOpenUserSex(openUser.sex),
      head: openUser.headimgurl
    })

    yield db.WechatUser.create({
      id: user.id,
      openid: accessToken.openid,
      accessToken: accessToken.access_token,
      refreshToken: accessToken.refresh_token
    })
  }

  user.openid = accessToken.openid
  return user
}

function getOpenUserSex (sex) {
  switch (sex) {
    case 1:
      return 'male'
    case 2:
      return 'female'
    case 0:
      return 'neutral'
  }
}

module.exports = exports
