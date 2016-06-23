var db = require('./../codes/db')
var router = require('koa-router')({
  prefix: '/notice/'
})
var sequelize = require('sequelize')

router.get('markRead', function * () {
  this.checkAuth()
  if (this.query !== undefined && this.query.id !== undefined) {
    var notice = yield db.Notice.findOne({
      where: {
        targetUser: this.user.id,
        id: this.query.id
      }
    })
    notice.update({
      state: true
    })
    notice.state = true
    this.body = notice
  } else {
    this.throw403('id')
  }
})

router.get('unread', function * () {
  this.checkAuth()
  var notice = yield db.Notice.findAll({
    where: {
      state: false,
      targetUser: this.user.id
    },
    attributes: ['type', [sequelize.fn('count', sequelize.col('id')), 'count']],
    group: ['type']
  })
  var unread = {
    refuseFriendRequest: 0,
    acceptFriendRequest: 0,
    friendRequest: 0,
    like: 0,
    reply: 0,
    comment: 0
  }
  notice.each(function (item) {
    unread[item['type']] = parseInt(item['dataValues']['count'])
  })
  this.body = unread
})

router.get('show', function * () {
  this.checkAuth()

  var options = {
    where: {
      targetUser: this.user.id
    },
    population: [{
      model: 'user',
      col: 'user'
    }, {
      model: 'status',
      col: [
        'option', 'status'
      ]
    }, {
      model: 'comment',
      col: [
        'option', 'comment'
      ]
    }, {
      model: 'comment',
      col: 'reply'
    }]
  }

  if (this.query.state !== undefined) {
    options.where.state = this.query.state
  }
  if (this.query.type !== undefined) {
    options.where.type = this.query.type.substring(0, this.query.type.length).split(',')
  }

  this.body = yield this.listQuery(db.Notice, options, 'notice', this.query.index)
})

router.unread = function * (targetUser) {
  // var systemNum = 0
  // var friendsNum = 0
  // if (notice) {
  //   notice.forEach(function (element) {
  //     if (element !== undefined && element.state !== undefined) {
  //       if (element.type === 'friendRequest' || element.type === 'refuseFriendRequest' || element.type === 'theFriendRequest') {
  //         friendsNum = friendsNum + 1
  //       } else if (element.type === 'comment' || element.type === 'reply') {
  //         systemNum = systemNum + 1
  //       }
  //     }
  //   }, this)
  // }
  // return {
  //   systemNum: systemNum,
  //   friendsNum: friendsNum
  // }
}

module.exports = router
