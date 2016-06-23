const db = require('./../codes/db')
const util = require('util')
const router = require('koa-router')({
  prefix: '/status/'
})
const sequelize = require('sequelize')

router.get('info', function * () {
  this.required('id')
  var status = yield db.Status.findById(this.query.id, {
    population: {
      model: ['user'],
      col: ['user']
    }
  })

  if (!status) {
    this.throw404(this.query.id)
    return
  }
  this.body = status
})

router.get('show', function * () {
  this.required('id')
  var options = {
    population: [{
      model: 'user',
      col: 'user'
    }, {
      model: 'comment',
      col: 'comment',
      population: [{
        model: 'user',
        col: 'user'
      }, {
        model: 'comment',
        col: 'target',
        population: {
          model: 'user',
          col: 'user'
        }
      }]
    }],
    attributes: {
      include: [
        [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('comment'), 1), 0), 'commentCount'],
        [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('like'), 1), 0), 'likeCount']
      ]
    }
  }

  if (this.user) {
    options.attributes.include.push([sequelize.fn('array_exist_id', sequelize.col('like'), this.user.id), 'isLike'])
  }

  this.body = yield this.arrayQuery(db.Status, this.query.id, options, 'comment', this.query.index)
})

router.get('publish', function * () {
  this.body = yield router.publishStatus.call(this)
})

router.get('public', function * () {
  var options = {
    where: {},
    limit: 25,
    order: 'id DESC',
    population: {
      model: 'user',
      col: 'user'
    },
    attributes: {
      include: [
        [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('comment'), 1), 0), 'commentCount'],
        [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('like'), 1), 0), 'likeCount'],
      ]
    }
  }

  if (this.user) {
    options.attributes.include.push([sequelize.fn('array_exist_id', sequelize.col('like'), this.user.id), 'isLike'])
  }

  this.body = yield this.listQuery(db.Status, options, 'status', this.query.index)
})

router.publishStatus = function * () {
  this.checkAuth()
  this.required('content')
  var photo = this.query['photo[]']

  if (photo) {
    if (util.isArray(photo)) {
      photo = this.query['photo[]'].map(function (item) { return parseInt(item) })
    } else {
      photo = [parseInt(photo)]
    }
  }

  var status = yield db.Status.create({
    content: this.query.content,
    longitude: this.query.longitude,
    latitude: this.query.latitude,
    photo: photo,
    user: this.user.id
  })

  var user = yield db.User.findById(this.user.id)
  user.setDataValue('status', sequelize.fn('array_cat', sequelize.col('status'), [Number(status.id)]))
  yield user.save({
    fields: ['status']
  })
  delete user.dataValues['status']
  status.user = user

  return status
// TODO 数据库的content字段个改为不限制长度的text content的长度需要做现在
}

module.exports = router
