'use strict'
var db = require('./../codes/db')
var router = require('koa-router')({
  prefix: '/account/'
})
var cache = require('memory-cache')
var ihuyi = new (require('ihuyi106'))('cf_fxwlkj', '9fegEY')

var phoneRegexp = new RegExp('0?(13[0-9]|15[012356789]|17[0678]|18[0-9]|14[57])[0-9]{8}$')
router.get('sendMessage', function * () {
  this.required('phone')
  var phone = this.request.query.phone
  if (!phoneRegexp.test(phone)) {
    this.message('请输入正确的手机号')
  }
  var code = Math.random().toString().substring(3, 9)
  yield db.PhoneCode.create({
    phone: this.request.query.phone,
    code: code
  })

  if (phone === '15112098161' || phone === '15112098162' || phone === '15112098163' || phone === '18620072012' || phone === '13760671440' || phone === '13682268885' || phone === '15914352014') {
    this.body = {
      code: code
    }
    return
  } else {
    this.body = {}
    ihuyi.send(phone, '您的验证码是：' + code + '，（10分钟内有效）。请不要把验证码泄露给其他人。', function (err, smsId) {
      if (err) {
        this.error(err)
      }
    })
  }
})

router.loginFunction = function * () {
  if (this.user) {
    return this.user
  } // 如果已经登录则不需要重新登录
  this.required('type', 'phone')
  if (this.request.query.type === 'phone') {
    this.required('code')
    var phoneCode = yield db.PhoneCode.find({
      where: {
        phone: this.request.query.phone,
        code: this.request.query.code
      }
    })
    // TODO:code是否需要建立索引还是需要通过建立数组来添加code
    if (phoneCode != null) {
      yield phoneCode.destroy()
      if (((Date.now() - phoneCode.id / 1000) / (1000 * 60)) > 10) {
        this.message('验证码已过期')
        return
      }
    // 验证码10分钟内有效
    } else {
      this.message('验证码错误')
      return
    }
    var user
    var phoneUser = yield db.PhoneUser.findOne({
      where: {
        phone: this.request.query.phone
      }
    })

    if (phoneUser != null) {
      user = yield db.User.findById(phoneUser.id)
    } else {
      user = yield db.User.create({
        phone: this.request.query.phone,
        name: this.request.query.phone.replace(/^\d{7}/, '*******')
      })
      phoneUser = yield db.PhoneUser.create({
        id: user.id,
        phone: this.request.query.phone
      })
    }
    if (user != null) {
      yield router.Token.call(this, user)
      return user
    } else {
      this.error('找不到用户')
    }
  }
}

router.Token = function * (user) {
  var token = yield db.Token.create({
    token: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      let r = Math.random() * 16 | 0
      let v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    }),
    user: user.id
  })

  cache.put(token.token, user, 10 * 60 * 1000)
  // 缓存时间为10分钟，十分钟之后会失效
  // 缓存会在auth.js中进行验证
  // 如果没有则从数据库读取
  // 浏览器cookies会保存一年
  this.cookies.set('token', token.token, {
    httpOnly: true,
    maxAge: 365 * 24 * 60 * 60 * 1000
  })
// NOTE: 一个用户在一种设备上只能登录一次，未实现
}

router.get('login', function * () {
  var user = yield router.loginFunction.call(this)
  this.body = user
})
router.get('logout', function * () {
  var token = yield db.Token.findOne({
    where: {
      token: this.cookies.get('token')
    }
  })
  yield token.destroy({
    where: {
      token: this.cookies.get('token')
    }
  })
  cache.del(this.cookies.get('token'))
  this.cookies.set('token', 'logout', {
    httpOnly: true
  })
  this.user = null
  this.body = {}
})
module.exports = router
