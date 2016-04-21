const key = '73b289d82ef5d57e0ad46ced521fc282'
var db = require('./../codes/db')
var crypto = require('crypto')
var router = require('koa-router')({
  prefix: '/wozaizheer/'
})
const routerAccount = require('./account')
const wechatLogin = require('../codes/wozaizheerWechatLogin')
var routerstatus = require('./../routes/status')
var sequelize = require('sequelize')
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
  var bubblemap = yield db.Bubblemap.create({
    id: status.id,
    map: this.query.map
  })
  status.dataValues.map = bubblemap.id
  this.body = status
})

router.get('public', function * () {
  // REVIEW:方案有误
  var bubblemap

  if (this.query !== undefined && this.query.index !== undefined) {
    if (this.query.index.charAt(0) === '>') { // shang
      bubblemap = yield db.Bubblemap.findAll({
        where: {
          map: this.query.map,
          id: {
            gt: this.query.index.substr(1)
          }
        },
        limit: 25,
        order: 'id ASC'
      })
      if (bubblemap.length > 1) {
        bubblemap.reverse()
      }
    } else if (this.query.index.charAt(0) === '<') { // xia
      bubblemap = yield db.Bubblemap.findAll({
        where: {
          map: this.query.map,
          id: {
            lt: this.query.index.substr(1)
          }
        },
        limit: 25,
        order: 'id DESC'
      })
    }
  } else {
    bubblemap = yield db.Bubblemap.findAll({
      where: {
        map: this.query.map
      },
      limit: 25,
      order: 'id DESC'
    })
  }

  var statuses = {}

  if (bubblemap !== undefined && bubblemap.length > 0) {
    var mapid = []
    bubblemap.forEach(function (element) {
      mapid.push(element.id)
    }, this)
    var include = [
      [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('comment'), 1), 0), 'commentCount'],
      [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('like'), 1), 0), 'likeCount']
    ]

    var status = yield db.Status.findAll({
      where: {
        id: mapid
      },
      order: 'id DESC',
      population: {
        model: 'user',
        col: 'user'
      },
      attributes: {
        include: include
      }

    })

    if (status !== undefined && status.length > 0) {
      statuses.status = status
      statuses.next = '<' + status[status.length - 1].id
      statuses.prev = '>' + status[0].id
    }
  } else {
    statuses.status = []
  }
  if (statuses) {
    this.body = statuses
  } else {
    this.throw404(this.query.map)
  }
})

module.exports = router
