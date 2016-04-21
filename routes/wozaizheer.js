const key = '73b289d82ef5d57e0ad46ced521fc282'
const db = require('./../codes/db')
const crypto = require('crypto')
const router = require('koa-router')({
  prefix: '/wozaizheer/'
})
const routerAccount = require('./account')
const wechatLogin = require('../codes/wozaizheerWechatLogin')
const routerstatus = require('./../routes/status')
const sequelize = require('sequelize')
const R = require('ramda')
router.get('login', function * () {
  var user = yield routerAccount.loginFunction.call(this)
  this.body = { token: router.createToken(this.request.query.phone), user: user }
})

router.get('wechatLogin', function * () {
  var user = yield wechatLogin.loginFunction.call(this)
  this.body = { token: router.createToken(user.openid), user: user }
})

router.createToken = function (mark) {
  var ticks = Date.now().toString().substr(3, 8)
  var md5 = crypto.createHash('md5')
  md5.update(mark + key + ticks)
  var code = md5.digest('hex')
  var token = new Buffer(code + mark + ticks).toString('base64')
  return token
}

router.get('publish', function * () {
  var status = yield routerstatus.publishStatus.call(this)
  yield db.Bubblemap.create({
    id: status.id,
    map: this.query.map
  })
  this.body = status
})

router.get('public', function * () {
  this.required('map')
  var option = {
    where: {map: this.query.map},
    limit: 25,
    order: 'id DESC',
    include: [{
      model: db.Status,
      attributes: {
        include: [
          [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('comment'), 1), 0), 'commentCount'],
          [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('like'), 1), 0), 'likeCount']
        ]
      }
    }]
  }
  if (this.query !== undefined && this.query.index !== undefined) {
    if (this.query.index.charAt(0) === '>') {
      option.where.id = {
        gt: this.query.index.substr(1)
      }
      option.order = 'id ASC'
    } else if (this.query.index.charAt(0) === '<') {
      option.where.id = {
        lt: this.query.index.substr(1)
      }
    }
  }

  var bubblemap = yield db.Bubblemap.findAll(option)

  if (option.order === 'id ASC') {
    bubblemap.reverse()
  }

  var statuses = {status: R.map((i) => i.status, bubblemap)}

  if (statuses.status.length > 0) {
    statuses.next = '<' + statuses.status[statuses.status.length - 1].id
    statuses.prev = '>' + statuses.status[0].id
  }

  this.body = statuses
})

module.exports = router
