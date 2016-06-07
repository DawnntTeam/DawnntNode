// TODO:对进行高级别的封装直接返回json而不是使用方法封装
var db = require('./db')
var request = require('co-request')
var appid = 'wxc0a647146519032d'
var secret = '2f266ea0108177d92dede19db2249d31'
var exports = {}

exports.getOauthAccessToken = function * (code) {
  var apiUrl = 'https://api.weixin.qq.com/sns/oauth2/access_token?appid=' + appid + '&secret=' + secret + '&code=' + code + '&grant_type=authorization_code'
  var data = yield request({
    method: 'GET',
    url: apiUrl
  })
  return JSON.parse(data.body)
}

exports.getAccessToken = function * () {
  var apiUrl = 'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=' + appid + '&secret=' + secret + '&grant_type=authorization_code'
  var data = yield request({
    method: 'GET',
    url: apiUrl
  })
  return JSON.parse(data.body)
}

exports.getUserInfo = function * (access_token, openid) {
  var apiUrl = 'https://api.weixin.qq.com/cgi-bin/user/info?access_token=' + access_token + '&openid=' + openid + '&lang=zh_CN'
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
    var token = yield exports.getAccessToken()
    var apiUrl = 'https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=' + token.access_token + '&type=jsapi'
    var data = yield request({
      method: 'GET',
      url: apiUrl
    })
    ticket.value = JSON.parse(data.body).ticket
    ticket.expries = new Date().getTime() + (6600 * 1000)
    yield ticket.save()
    ticket = JSON.parse(data.body).ticket
  } else {
    ticket = ticket.dataValues.value
  }
  return ticket
}

exports.loginFunction = function * () {
  return yield db.User.findById(1464919901585000)
  // var accessToken = yield exports.getOauthAccessToken(this.query.code)
  // if (accessToken.errcode !== undefined) {
  //   this.throw400(accessToken.errcode)
  // }

  // var wechatUser = yield db.WechatUser.find({ where: { openid: accessToken.openid } })
  // var user
  // if (wechatUser != null) {
  //   user = yield db.User.findById(wechatUser.id)
  //   wechatUser.accessToken = accessToken.access_token
  //   wechatUser.refresToken = accessToken.refresh_token
  //   wechatUser.save()
  // } else {
  //   var token = yield exports.getAccessToken()
  //   if (token.errcode !== undefined) {
  //     this.throw400(token.errcode)
  //   }

  //   var openUser = yield exports.getUserInfo(token.access_token, accessToken.openid)
  //   if (openUser.errcode !== undefined) {
  //     this.throw400(openUser.errcode)
  //   }

  //   var sex
  //   switch (openUser.sex) {
  //     case 1:
  //       sex = 'male'
  //       break
  //     case 2:
  //       sex = 'female'
  //       break
  //     case 0:
  //       sex = 'neutral'
  //       break
  //   }
  //   user = yield db.User.create({
  //     name: openUser.nickname,
  //     sex: sex,
  //     head: openUser.headimgurl
  //   })

  //   yield db.WechatUser.create({
  //     id: user.id,
  //     openid: accessToken.openid,
  //     accessToken: accessToken.access_token,
  //     refreshToken: accessToken.refresh_token,
  //     token: token.access_token
  //   })
  // }

  // yield account.Token.call(this, user)
  // user.openid = accessToken.openid
  // return user
}

module.exports = exports
