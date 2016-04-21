var db = require('./../codes/db')

var router = require('koa-router')({
  prefix: '/status/'
})
var sequelize = require('sequelize')
router.get('info', function * () {
  this.required('id')
  var status = yield db.Status.findById(this.request.query.id, {
    population: {
      model: ['user'],
      col: ['user']
    }
  })

  if (status) {
    this.body = status
  } else {
    this.throw404('id')
  }
})

router.get('show', function * () {
  this.required('id')
  var page = this.pagingSlice(this.query.index)
  var include = [
    [sequelize.fn('array_slice_id', sequelize.col('comment'), page.slice[0], page.slice[1]), 'comment'],
    [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('comment'), 1), 0), 'commentCount'],
    [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('like'), 1), 0), 'likeCount']
  ]
  if (this.user && this.user.id) {
    include.push([sequelize.fn('array_exist_id', sequelize.col('like'), this.user.id), 'isLike'])
  }
  var status = yield db.Status.findById(this.query.id, {
    population: [{
      model: 'user',
      col: 'user'
    }, {
      model: 'comment',
      population: [{
        model: 'user',
        col: 'user'
      }, {
        model: 'comment',
        population: {
          model: 'user',
          col: 'user'
        },
        col: 'target'
      }],
      col: 'comment'
    }],
    attributes: {
      include: include
    }

  }) // 获取Status

  if (status) {
    this.pagingPointer(this.query.index, status, 'comment')
    this.body = status
  } else {
    this.throw404('id')
  }
})

router.get('publish', function * () {
  this.body = yield router.publishStatus.call(this)
})

router.get('public', function * () {
  this.body = yield router.publicStatus.call(this)
})

router.publicStatus = function * () {
  var status
  var include = [
    [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('comment'), 1), 0), 'commentCount'],
    [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('like'), 1), 0), 'likeCount']
  ]
  if (this.query !== undefined && this.query.index !== undefined) {
    if (this.query.index.charAt(0) === '>') { // shang
      status = yield db.Status.findAll({
        where: {
          id: {
            gt: this.query.index.substr(1)
          }
        },
        limit: 25,
        order: 'id ASC',
        population: {
          model: 'user',
          col: 'user'
        },
        attributes: {
          include: include
        }
      })
      if (status.length > 1) {
        status.reverse()
      }
    } else { // xia
      status = yield db.Status.findAll({
        where: {
          id: {
            lt: this.query.index.substr(1)
          }
        },
        limit: 25,
        order: 'id DESC',
        population: {
          model: 'user',
          col: 'user'
        },
        attributes: {
          include: include
        }
      })
    }
  } else {
    status = yield db.Status.findAll({
      limit: 25,
      order: 'id DESC',
      population: {
        model: 'user',
        col: 'user'
      },
      attributes: {
        include: include
      }
    })
  }

  var statuses = {}

  if (status.length > 0) {
    statuses.status = status
    statuses.next = '<' + status[status.length - 1].id
    statuses.prev = '>' + status[0].id
  }
  return statuses
}

router.publishStatus = function * () {
  this.checkAuth()
  this.required('content')
  var status = yield db.Status.create({
    content: this.request.query.content,
    longitude: this.request.query.longitude,
    latitude: this.request.query.latitude,
    user: this.user.id
  })
  var user = yield db.User.findById(this.user.id)
  // user.statusCount = (user.status.length || 0)+1
  user.setDataValue('status', sequelize.fn('array_cat', sequelize.col('status'), [parseInt(status.id)]))
  yield user.save({
    fields: ['status']
  })
  delete user.dataValues['status']
  status.user = user

  return status
}

module.exports = router
