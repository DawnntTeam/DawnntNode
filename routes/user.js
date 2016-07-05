var db = require('./../codes/db')
var router = require('koa-router')({
  prefix: '/user/'
})
var sequelize = require('sequelize')

router.get('info', function * () {
  if (this.query.id || this.user) {
    var include = [
      [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('status'), 1), 0), 'statusCount'],
      [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('relation'), 1), 0), 'relationCount']
    ]
    if (this.user) {
      include.push([sequelize.fn('array_exist_id', sequelize.col('relation'), this.user.id), 'isFriend'])
    }
    var user = yield db.User.findById(this.query.id || this.user.id, {
      attributes: {
        include: include
      }
    })
    if (!user) {
      this.throw404(this.query.id)
      return
    }
    this.body = user
  } else {
    this.checkAuth()
  }
// 如果没有传入id并且没有登录,则会抛出已登录
})

router.get('show', function * () {
  if (!(this.query.id || this.user))  this.checkAuth()

  var options = {
    population: {
      model: 'status',
      col: 'status',
      options: {
        attributes: {
          include: [
            [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('comment'), 1), 0), 'commentCount'],
            [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('like'), 1), 0), 'likeCount']
          ]
        }
      }
    },
    attributes: {
      include: [
        [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('status'), 1), 0), 'statusCount'],
        [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('relation'), 1), 0), 'relationCount']
      ]
    }
  }

  if (this.user) {
    options.attributes.include.push([sequelize.fn('array_exist_id', sequelize.col('relation'), this.user.id), 'isFriend'])
    options.population.options.attributes.include.push([sequelize.fn('array_exist_id', sequelize.col('like'), this.user.id), 'isLike'])
  }

  this.body = yield this.arrayQuery(db.User, this.query.id || this.user.id, options, 'status', this.query.index)
})

router.get('save', function * () {
  this.checkAuth()
  var query = this.query
  var user = yield db.User.findById(this.user.id)
  for (var key in query) {
    user[key] = query[key]
  }
  yield user.update({
    name: user.name,
    email: user.email,
    head: user.head,
    birthday: user.birthday,
    sex: user.sex,
    desc: user.desc
  })
  this.body = user
})

module.exports = router
