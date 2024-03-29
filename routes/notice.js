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
  var where = {
    targetUser: this.user.id
  }
  var order = 'id DESC'

  if (this.query !== undefined) {
    if (this.query.state !== undefined) {
      where.state = this.query.state
    }
    if (this.query.type !== undefined) {
      where.type = this.query.type.substring(0, this.query.type.length).split(',')
    }
    if (this.query.index !== undefined) {
      if (this.query.index.charAt(0) === '>') { // shang
        where.id = {
          gt: this.query.index.substr(1)
        }
        order = 'id ASC'
      } else { // 下一页 next
        where.id = {
          lt: this.query.index.substr(1)
        }
      }
    }
  }
  var date = {
    notice: []
  }
  var notice = yield db.Notice.findAll({
    where: where,
    limit: 25,
    order: order,
    population: [{
      model: 'user',
      col: 'user'
    }, {
      model: 'user',
      col: 'targetUser'
    }, {
      model: 'status',
      col: 'status'
    }, {
      model: 'comment',
      col: 'comment'
    }, {
      model: 'comment',
      col: 'reply'
    }]
  })

  if (notice.length > 0) {
    if (order === 'id ASC' && notice.length > 1) {
      notice.reverse()
    }
    date.notice = notice
    date.next = '<' + notice[notice.length - 1].id
    date.prev = '>' + notice[0].id
  }
  this.body = date
})

router.get('info', function * () {
  this.checkAuth()
  if (this.query !== undefined && this.query.id !== undefined) {
    var notice = yield db.Notice.findById(this.query.id, {
      population: [{
        model: 'user',
        col: 'targetUser'
      }, {
        model: 'user',
        col: 'user'
      }]
    })
    this.body = notice
  } else {
    this.throw404('id')
  }
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
