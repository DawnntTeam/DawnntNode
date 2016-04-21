var db = require('./../codes/db')
var router = require('koa-router')({
  prefix: '/notify/'
})
// var routesSocket = require('./../routes/socket')

router.get('markRead', function * () {
  this.checkAuth()
  if (this.query !== undefined && this.query.id !== undefined) {
    var notify = yield db.Notify.findOne({
      where: {
        targetUser: this.user.id,
        id: this.query.id
      }
    })
    notify.update({
      state: true
    })
    notify.state = true
    this.body = notify
  } else {
    this.throw403('id')
  }
})
router.get('markSeveralRead', function * () {
  this.checkAuth()

  if (this.query !== undefined && this.query.id !== undefined) {
    var temp = this.query.id.substring(0, this.query.id.length).split(',')

    yield db.Notify.update({
      state: true
    }, {
      where: {
        id: temp
      }
    })
    this.body = yield db.Notify.findAll({
      where: {
        id: temp
      }
    })
  } else {
    this.throw403('id')
  }
})

router.get('unread', function * () {
  this.checkAuth()
  this.body = yield router.unread(this.user.id)
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
    notify: []
  }
  var notify = yield db.Notify.findAll({
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

  if (notify.length > 0) {
    if (order === 'id ASC' && notify.length > 1) {
      notify.reverse()
    }
    date.notify = notify
    date.next = '<' + notify[notify.length - 1].id
    date.prev = '>' + notify[0].id
  }
  this.body = date
})

router.get('info', function * () {
  this.checkAuth()
  if (this.query !== undefined && this.query.id !== undefined) {
    var notify = yield db.Notify.findById(this.query.id, {
      population: [{
        model: 'user',
        col: 'targetUser'
      }, {
        model: 'user',
        col: 'user'
      }]
    })
    this.body = notify
  } else {
    this.throw404('id')
  }
})

router.unread = function * (targetUser) {
  var notify = yield db.Notify.findAll({
    where: {
      state: false,
      targetUser: targetUser
    }
  })
  var systemNum = 0
  var friendsNum = 0
  if (notify) {
    notify.forEach(function (element) {
      if (element !== undefined && element.state !== undefined) {
        if (element.type === 'friendRequest' || element.type === 'refuseFriendRequest' || element.type === 'theFriendRequest') {
          friendsNum = friendsNum + 1
        } else if (element.type === 'comment' || element.type === 'reply') {
          systemNum = systemNum + 1
        }
      }
    }, this)
  }
  return {
    systemNum: systemNum,
    friendsNum: friendsNum
  }
}
// router.notifyCaeateAndEmit = function*(type, user, tatgetUser, comment, status, reply) {
//     yield db.Notify.create({
//         type: type, //回复
//         state: false,
//         user: user,
//         targetUser: tatgetUser, //目标用户
//         comment: comment, //
//         status: status,
//         reply: reply
//     })
//     if (routesSocket.user[tatgetUser] !== undefined && routesSocket.sockets !== undefined && routesSocket.sockets.connected !== undefined && routesSocket.sockets.connected[routesSocket.user[tatgetUser]] !== undefined) {
//         var temp = yield router.unread(tatgetUser)
//         routesSocket.sockets.connected[routesSocket.user[tatgetUser]].emit('show', temp)
//     }
// }
// router.SecectNotify= function* (where,order) {
//    var date={}
//    var notify = yield db.Notify.findAll({where:where,limit: 25,order:order,
//        population: [{ model: 'user',col: 'targetUser'},{ model: 'user',col: 'user'}]
//     })

//    if(notify.length>0){
//        if(order=='id ASC'&&notify.length>1){
//             notify.reverse()
//        }
//        date.notify=notify
//        date.next='<'+notify[notify.length-1].id
//        date.prev='>'+notify[0].id
//    }
//    return date
// }

module.exports = router
