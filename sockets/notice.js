'use strict'
var db = require('./../codes/db')
var router = require('./../codes/koa.io-router')({
  of: 'notice'
})

router.emitNotice = function * (type, user, targetUser, option) {
  if (user.id === targetUser.id) return
  // 同样的用户不需要发送通知
  var notice = {
    type: type,
    state: false,
    user: user.id,
    targetUser: targetUser && targetUser.id,
    option: {}
  }
  for (let key in option) {
    if (option[key] && option[key].id) {
      notice.option[key] = option[key].id
    }
  }
  var temp = yield db.Notice.create(notice)
  temp.dataValues.user = user
  temp.dataValues.targetUser = targetUser
  for (let key in option) {
    temp.option[key] = option[key]
  }
  router.emitById(user.id, 'notice', temp)
}

module.exports = router
