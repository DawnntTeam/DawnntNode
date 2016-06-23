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
  if (!(this.query.id || this.user))  this.checkAuth()

  var options = {
    attributes: {
      include: [
        [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('album'), 1), 0), 'albumCount']
      ]
    }
  }

  this.body = yield this.arrayQuery(db.User, this.query.id || this.user.id, options, 'album', this.query.index)
})

router.get('destroy', function * () {
  this.checkAuth()
  this.required(['id', 'ids'])
  var user = yield db.User.findById(this.user.id)
  user.setDataValue('album', sequelize.fn('array_remove_id', sequelize.col('album'), this.query.ids.split(',').map(Number)))
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
