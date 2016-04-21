// TODO:对进行高级别的封装直接返回json而不是使用方法封装
var db = require('./db')
var account = require('./../routes/account')
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

exports.loginFunction = function * () {
  var accessToken = yield exports.getOauthAccessToken(this.query.code)
  if (accessToken.errcode !== undefined) {
    this.throw400(accessToken.errcode)
  }

  var wechatUser = yield db.WozaizheerWechatUser.find({ where: { openid: accessToken.openid } })
  var user
  if (wechatUser != null) {
    user = yield db.User.findById(wechatUser.id)
  } else {
    var token = yield exports.getAccessToken
    if (token.errcode !== undefined) {
      this.throw400(token.errcode)
    }

    var openUser = yield exports.getUserInfo(token.access_token, accessToken.openid)
    if (openUser.errcode !== undefined) {
      this.throw400(openUser.errcode)
    }

    var sex
    switch (openUser.sex) {
      case 1:
        sex = 'male'
        break
      case 2:
        sex = 'female'
        break
      case 0:
        sex = 'neutral'
        break
    }
    user = yield db.User.create({
      name: openUser.nickname,
      sex: sex,
      head: openUser.headimgurl
    })

    yield db.WozaizheerWechatUser.create({
      id: user.id,
      openid: accessToken.openid,
      accessToken: accessToken.access_token,
      refreshToken: accessToken.refresh_token,
      token: token.access_token
    })
  }

  yield account.Token.call(this, user)
  user.openid = accessToken.openid
  return user
}

module.exports = exports
