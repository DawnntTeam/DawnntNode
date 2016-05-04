﻿const key = '73b289d82ef5d57e0ad46ced521fc282'
const db = require('./../codes/db')
const crypto = require('crypto')
const sequelize = require('sequelize')

const router = require('koa-router')({
  prefix: '/wozaizheer/'
})
const routerAccount = require('./account')
const wechatLogin = require('../codes/wozaizheerWechatLogin')
const routerstatus = require('./../routes/status')

router.get('login', function * () {
  var user = yield routerAccount.loginFunction.call(this)
  this.body = { token: router.createToken(this.request.query.phone, user.id), user: user }
})

router.get('wechatLogin', function * () {
  var user = yield wechatLogin.loginFunction.call(this)
  this.body = { token: router.createToken(user.openid, user.id), user: user }
})

router.createToken = function (mark, userId) {
  var ticks = Date.now().toString().substr(3, 8)
  var md5 = crypto.createHash('md5')
  md5.update(mark + userId + key + ticks)
  var code = md5.digest('hex')
  var token = new Buffer(code + userId + mark + ticks).toString('base64')
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
    order: 'id DESC'
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

  var status = yield db.Status.findAll({
    where: {
      id: bubblemap.map((i) => i.id)
    },
    order: option.order,
    limit: option.limit,
    population: {
      model: 'user',
      col: 'user'
    },
    attributes: {
      include: [
        [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('comment'), 1), 0), 'commentCount'],
        [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('like'), 1), 0), 'likeCount']
      ]
    }
  })

  if (option.order === 'id ASC') {
    status.sort(function (a, b) {
      return a.id < b.id ? 1 : -1
    })
  } else {
    status.sort(function (a, b) {
      return a.id < b.id ? 1 : -1
    })
  }

  var statuses = {status: status}

  if (statuses.status.length > 0) {
    statuses.next = '<' + status[status.length - 1].id
    statuses.prev = '>' + status[0].id
  }

  this.body = statuses
})

module.exports = router
