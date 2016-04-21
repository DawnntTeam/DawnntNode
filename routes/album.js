var db = require('./../codes/db')
var router = require('koa-router')({
  prefix: '/album/'
})
var sequelize = require('sequelize')
router.get('create', function * () {
  this.checkAuth()
  this.required('id')
  var user = yield db.User.findById(this.user.id)
  user.setDataValue('album', sequelize.fn('array_cat', sequelize.col('album'), [Number(this.query.id)]))
  yield user.save({
    fields: ['album']
  })
  delete user.dataValues['album']
  this.body = true
})

router.get('show', function * () {
  var page = this.pagingSlice(this.query.index)
  var user = yield db.User.findById(this.query.id || this.user.id, {
    attributes: {
      include: [
        [sequelize.fn('array_slice_id', sequelize.col('album'), page.slice[0], page.slice[1]), 'album'],
        [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('album'), 1), 0), 'albumCount']
      ]
    }
  })
  if (user) {
    this.pagingPointer(this.query.index, user, 'album')
    this.body = user
  } else {
    this.throw404('id')
  }
})

router.get('destroy', function * () {
  this.checkAuth()
  this.required('id')
  var user = yield db.User.findById(this.user.id)
  user.setDataValue('album', sequelize.fn('multi_int_array_remove', sequelize.col('album'), [Number(this.query.id)]))
  yield user.save({
    fields: ['album']
  })
  delete user.dataValues['album']
  this.body = true
})

// 相册封面设置
router.get('coverSet', function * () {
  this.checkAuth()
  this.required('id')
  var user = yield db.User.findById(this.user.id, {
    attributes: {
      include: [
        [sequelize.fn('array_exist_id', sequelize.col('album'), this.query.id), 'exists']
      ]
    }
  })
  if (user.dataValues.exists) {
    user.setDataValues('albumCover', this.query.id)
    yield user.save({
      fields: ['albumCover']
    })
    delete user.dataValues['albumCover']
    // REVIEW:应该是可以直接设置的不需要用到serDataValues
    this.body = true
  } else {
    this.throw400('相册中不存在该图片')
  }
})

module.exports = router
