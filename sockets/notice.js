var db = require('./../codes/db')
var router = require('./../codes/koa.io-router')({
  of: 'notice'
})

router.emitNotice = function * (type, user, targetUser, status, comment, reply) {
  if (user === targetUser) return
  // 同样的用户不需要发送通知
  var temp = yield db.Notify.create({
    type: type,
    state: false,
    user: user.id,
    targetUser: targetUser && targetUser.id,
    status: status && status.id,
    comment: comment && comment.id,
    reply: reply && reply.id
  })
  temp.dataValues.user = user
  temp.dataValues.targetUser = targetUser
  temp.dataValues.status = status
  temp.dataValues.comment = comment
  temp.dataValues.reply = reply
  router.emitById(targetUser.id, 'notice', temp)
}

module.exports = router
