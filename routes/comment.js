var db = require('./../codes/db')
var socketNotice = require('./../sockets/notice')
var router = require('koa-router')({
  prefix: '/comment/'
})
var sequelize = require('sequelize')
router.get('publish', function * () {
  this.checkAuth()
  this.required('id', 'content')

  var status = yield db.Status.findById(this.request.query.id)
  if (!status) {
    this.throw404(this.request.query.id)
    return
  }

  var comment = yield db.Comment.create({
    status: this.request.query.id,
    content: this.request.query.content,
    longitude: this.request.query.longitude,
    latitude: this.request.query.latitude,
    user: this.user.id
  })

  status.setDataValue('comment', sequelize.fn('array_cat', sequelize.col('comment'), [Number(comment.id)]))
  yield status.save({
    fields: ['comment']
  })
  delete status.dataValues['comment']

  comment.status = status
  comment.user = yield db.User.findById(this.user.id)
  yield socketNotice.emitNotice('comment', this.user.id, status.user, comment.id, status.id)
  this.body = comment
})

router.get('reply', function * () {
  this.checkAuth()
  this.required('id', 'content', 'target')

  var status = yield db.Status.findById(this.request.query.id)

  if (!status) {
    this.throw404(this.request.query.id)
    return
  }

  var target = yield db.Comment.findById(this.request.query.target)

  if (!target) {
    this.throw404(this.request.query.target)
    return
  }

  var comment = yield db.Comment.create({
    status: this.request.query.id,
    content: this.request.query.content,
    longitude: this.request.query.longitude,
    latitude: this.request.query.latitude,
    user: this.user.id,
    target: this.request.query.target
  })

  status.setDataValue('comment', sequelize.fn('array_cat', sequelize.col('comment'), [Number(comment.id)]))
  yield status.save({
    fields: ['comment']
  })
  delete status.dataValues['comment']

  comment.status = status
  comment.target = target
  comment.user = yield db.User.findById(this.user.id)

  if (status.user.id !== target.user.id) {
    yield socketNotice.emitNotice('comment', this.user.id, status.user, comment.id, status.id)
  } // 如果评论和状态是作者，则只发送回复的通知
  yield socketNotice.emitNotice('reply', this.user.id, target.user, comment.id, status.id, target.id)

  this.body = comment
})

module.exports = router
