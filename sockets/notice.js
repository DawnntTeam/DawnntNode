var db = require('./../codes/db')
var router = require('./../codes/koa.io-router')({
  of: 'notice'
})

// router.route("connect", function(socket){
//     socket.emit('open');//通知客户端已连接

//     socket.route('new message', function*() {
//         socket.emitById(this.user.id, 'online', this.data)
//     })

//     socket.emitNotice = function*(type, user, targetUser, comment, status, reply) {
//         yield db.Notify.create({
//             type: type,
//             state: false,
//             user: user,
//             targetUser: targetUser,
//             comment: comment,
//             status: status,
//             reply: reply
//         })
//         socket.emitById(user, 'notice', type)
//     }
// })

router.route('new message', function * () {
  router.emitById(this.user.id, 'online', this.data)
})

router.emitNotice = function * (type, user, targetUser, comment, status, reply) {
  var temp = yield db.Notify.create({
    type: type,
    state: false,
    user: user,
    targetUser: targetUser,
    comment: comment,
    status: status,
    reply: reply
  })
  var notify = yield db.Notify.findById(temp.id, {
    population: [{ model: 'user', col: 'targetUser' }, { model: 'user', col: 'user' }]
  })
  router.emitById(targetUser, 'notice', notify)
}

module.exports = router
