var db = require('./../codes/db')

var router = require('koa-router')({
  prefix: '/like/'
})

var sequelize = require('sequelize')
router.get('create', function *() {
  this.checkAuth()
  this.required('id')

  var status = yield db.Status.findById(this.query.id, {
    attributes: {
      include: [
        [sequelize.fn('array_exist_id', sequelize.col('like'), this.user.id), 'isLike'],
        [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('like'), 1), 0), 'likeCount']
        // [sequelize.col('like'), 'like']
      ]
    }
  })

  if (status) {
    if (status.dataValues.isLike) {
      this.throw403('id')
    } else {
      // status.like.push(this.user.id)
      // status.dataValues.likeCount = (status.dataValues.likeCount | 0) + 1
      // yield status.update({ like: status.like })
      status.setDataValue('like', sequelize.fn('array_cat', sequelize.col('like'), [parseInt(this.user.id)]))
      yield status.save({
        fields: ['like']
      })
      delete status.dataValues['like']
      status.dataValues.isLike = true
      status.dataValues.likeCount = status.dataValues.likeCount + 1
      this.body = status
    }
  } else {
    this.throw404('id')
  }
})

router.get('destroy', function *() {
  this.checkAuth()
  this.required('id')
  var status = yield db.Status.findById(this.query.id, {
    attributes: {
      include: [
        [sequelize.fn('array_exist_id', sequelize.col('like'), this.user.id), 'isLike'],
        [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('like'), 1), 0), 'likeCount']
        // [sequelize.col('like'), 'like']
      ]
    }
  })

  if (status) {
    if (status.dataValues.isLike) {
      // if (status.like != null) {
      // status.like.remove(this.user.id)
      // yield status.update({ like: status.like })
      status.setDataValue('like', sequelize.fn('array_remove', sequelize.col('like'), parseInt(this.user.id)))
      yield status.save({
        fields: ['like']
      })
      delete status.dataValues['like']
      status.dataValues.isLike = false
      status.dataValues.likeCount = status.dataValues.likeCount - 1
      this.body = status
      // }
    } else {
      this.throw403('id')
    }
  } else {
    this.throw404('id')
  }
})
module.exports = router
