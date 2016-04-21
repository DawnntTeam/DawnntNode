var db = require('./../codes/db')
var router = require('./../codes/koa.io-router')({
  of: 'notice'
})

router.emitNotice = function * (type, user, targetUser, comment, status, reply) {
  if (user === targetUser) return
  // 同样的用户不需要发送通知
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
