const db = require('./../codes/db')
const util = require('util')
const router = require('koa-router')({
  prefix: '/status/'
})
const sequelize = require('sequelize')

router.get('info', function * () {
  this.required('id')
  var status = yield db.Status.findById(this.request.query.id, {
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
  var page = this.pagingSlice(this.query.index)
  var include = [
    [sequelize.fn('array_slice_id', sequelize.col('comment'), page.slice[0], page.slice[1]), 'comment'],
    [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('comment'), 1), 0), 'commentCount'],
    [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('like'), 1), 0), 'likeCount']
  ]
  if (this.user) {
    include.push([sequelize.fn('array_exist_id', sequelize.col('like'), this.user.id), 'isLike'])
  }
  var status = yield db.Status.findById(this.query.id, {
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
      include: include
    }

  })

  if (!status) {
    this.throw404(this.query.id)
    return
  }
  status.dataValues.comment.reverse()

  this.body = status
})

router.get('publish', function * () {
  this.body = yield router.publishStatus.call(this)
})

router.get('public', function * () {
  this.body = yield router.publicStatus.call(this)
})

router.publicStatus = function * () {
  var option = {
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
        [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('like'), 1), 0), 'likeCount']
      ]
    }
  }

  if (this.query !== undefined) {
    if (this.query.index !== undefined) {
      if (this.query.index.charAt(0) === '>') {
        option.where.id = {
          gt: this.query.index.substr(1)
        }
        option.order = 'id ASC'
      } else if (this.query.index.charAt(0) === '<') {
        option.where.id = {
          lt: this.query.index.substr(1)
        }
      }
    }
  }

  var status = yield db.Status.findAll(option)

  var statuses = {status: status}

  if (status.length > 0) {
    if (option.order === 'id ASC') {
      status.reverse()
    }
    statuses.next = '<' + status[status.length - 1].id
    statuses.prev = '>' + status[0].id
  } else if (option.where.id.gt) {
    statuses.prev = this.query.index
  }

  return statuses
}

router.publishStatus = function * () {
  this.checkAuth()
  this.required('content')
  var photo = this.request.query['photo[]']

  if (photo) {
    if (util.isArray(photo)) {
      photo = this.request.query['photo[]'].map(function (item) { return parseInt(item) })
    } else {
      photo = [parseInt(photo)]
    }
  }

  var status = yield db.Status.create({
    content: this.request.query.content,
    longitude: this.request.query.longitude,
    latitude: this.request.query.latitude,
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
