var db = require('./../codes/db')
var router = require('koa-router')({
  prefix: '/user/'
})
var sequelize = require('sequelize')

router.get('info', function * () {
  if (this.request.query.id || this.user) {
    var include = [
      [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('status'), 1), 0), 'statusCount'],
      [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('relation'), 1), 0), 'relationCount']
    ]
    if (this.user) {
      include.push([sequelize.fn('array_exist_id', sequelize.col('relation'), this.user.id), 'isFriend'])
    }
    var user = yield db.User.findById(this.request.query.id || this.user.id, {
      attributes: {
        include: include
      }
    })
    if (!user) {
      this.throw404(this.request.query.id)
      return
    }
    this.body = user
  } else {
    this.checkAuth()
  }
// 如果没有传入id并且没有登录,则会抛出已登录
})

router.get('show', function * () {
  if (this.request.query.id || this.user) {
    var page = this.pagingSlice(this.query.index)

    var include = [
      [sequelize.fn('array_slice_id', sequelize.col('status'), page.slice[0], page.slice[1]), 'status'],
      [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('status'), 1), 0), 'statusCount'],
      [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('relation'), 1), 0), 'relationCount'],
      [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('black'), 1), 0), 'blackCount']
    ]
    if (this.user) {
      include.push([sequelize.fn('array_exist_id', sequelize.col('relation'), this.user.id), 'isFriend'])
    }
    var user = yield db.User.findById(this.request.query.id || this.user.id, {
      attributes: {
        include: include
      }
    })
    if (!user) {
      this.throw404(this.request.query.id)
      return
    }
    var status = yield db.Status.findAll({
      where: {
        id: user.dataValues.status
      },
      attributes: {
        include: [
          [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('comment'), 1), 0), 'commentCount'],
          [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('like'), 1), 0), 'likeCount']
        ]
      }
    })
    user.dataValues.status = status
    if (user.dataValues.status != null) {
      this.pagingPointer(this.query.index, user, 'status')
    }
    // NOTE:等到population支持attributes时使用population
    this.body = user
  } else {
    this.checkAuth()
  }
})

router.get('save', function * () {
  this.checkAuth()
  var query = this.request.query
  var user = yield db.User.findById(this.user.id)
  for (var key in query) {
    user[key] = query[key]
  }
  yield user.update({
    name: user.name,
    email: user.email,
    head: user.head,
    birthday: user.birthday,
    black: user.black,
    sex: user.sex,
    desc: user.desc
  })
  this.body = user
})

module.exports = router
