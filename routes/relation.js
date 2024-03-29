var db = require('./../codes/db')
var socketNotice = require('./../sockets/notice')
var router = require('koa-router')({
  prefix: '/relation/'
})
var sequelize = require('sequelize')

// 好友申请
router.get('friendRequest', function * () {
  this.checkAuth()
  this.required('id')

  if (this.user.id === this.query.id) {
    this.throw400('无法添加自己为好友')
    return
  }

  var user = yield db.User.findById(this.query.id, {
    attributes: {
      include: [
        [sequelize.fn('array_exist_id', sequelize.col('relation'), this.user.id), 'isFriend'],
        [sequelize.fn('array_exist_id', sequelize.col('black'), this.user.id), 'isBlack']
      ]
    }
  })

  if (!user) {
    this.throw404(this.query.id)
    return
  }

  var targetUser = yield db.User.findById(this.user.id, {
    attributes: {
      include: [
        [sequelize.fn('array_exist_id', sequelize.col('relation'), this.query.id), 'isFriend'],
        [sequelize.fn('array_exist_id', sequelize.col('black'), this.query.id), 'isBlack']
      ]
    }
  })

  if (user.dataValues.isFriend !== targetUser.dataValues.isFriend) {
    this.throw500('isFriend')
    return
  }

  if (user.dataValues.isFriend || targetUser.dataValues.isFriend) {
    this.throw403('你们已经是好友关系')
    return
  }

  if (targetUser.dataValues.isBlack) {
    this.throw403('该好友在黑名单列表中')
    return
  }

  if (user.dataValues.isBlack) {
    this.throw400('该用户已经把你加入黑名单')
    return
  }

  var isRequest = yield db.Notice.count({
    where: {
      user: this.user.id,
      targetUser: this.query.id,
      type: 'friendRequest',
      state: false
    }
  })

  if (isRequest) {
    this.throw400('您已经发起过对该用户的好友申请')
    return
  }

  yield socketNotice.emitNotice('friendRequest', targetUser, user)

  this.body = user
})

// 拒绝好友申请
router.get('refuseFriendRequest', function * () {
  this.checkAuth()
  this.required('id')

  var notice = yield db.Notice.findById(this.query.id)
  if (!notice) {
    this.throw404(this.query.id)
    return
  }

  if (this.user.id !== notice.targetUser) {
    this.throw403('该用户并非向你发起好友申请')
    return
  }

  notice.setDataValue('option', {
    action: 'refuseFriendRequest'
  })
  notice.save({
    fields: ['option']
  })
  notice.option = {
    action: 'refuseFriendRequest'
  }

  // yield socketNotice.emitNotice('refuseFriendRequest', notice.targetUser, notice.user)
  // 拒绝好友貌似不需要发送通知

  this.body = notice
})

// 同意好友申请
router.get('acceptFriendRequest', function * () {
  this.checkAuth()
  this.required('id')

  var notice = yield db.Notice.findById(this.query.id)

  if (!notice) {
    this.throw404(this.query.id)
    return
  }

  if (this.user.id !== notice.targetUser) {
    this.throw403('该用户并非向你发起好友申请')
    return
  }

  var user = yield db.User.findById(notice.user, {
    attributes: {
      include: [
        [sequelize.fn('array_exist_id', sequelize.col('relation'), notice.targetUser), 'isFriend'],
        [sequelize.fn('array_exist_id', sequelize.col('black'), notice.targetUser), 'isBlack'],
        [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('relation'), 1), 0), 'friendCount']
      ]
    }
  })

  var targetUser = yield db.User.findById(notice.targetUser, {
    attributes: {
      include: [
        [sequelize.fn('array_exist_id', sequelize.col('relation'), notice.user), 'isFriend'],
        [sequelize.fn('array_exist_id', sequelize.col('black'), notice.user), 'isBlack'],
        [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('relation'), 1), 0), 'friendCount']
      ]
    }
  })

  if (user.id === targetUser.id) {
    this.throw403('无法添加自己为好友')
    return
  }

  if (user.dataValues.isFriend !== targetUser.dataValues.isFriend) {
    this.throw500('isFriend')
    return
  }

  if (user.dataValues.isFriend || targetUser.dataValues.isFriend) {
    this.throw403('你们已经是好友关系')
    return
  }

  if (user.dataValues.isBlack || targetUser.dataValues.isBlack) {
    this.throw403('该好友在黑名单列表中')
    return
  }

  var transaction = yield db.sequelize.transaction()
  user.setDataValue('relation', sequelize.fn('array_cat', sequelize.col('relation'), [Number(targetUser.id)]))
  targetUser.setDataValue('relation', sequelize.fn('array_cat', sequelize.col('relation'), [Number(user.id)]))

  try {
    yield user.save({
      fields: ['relation'],
      transaction: transaction
    })

    yield targetUser.save({
      fields: ['relation'],
      transaction: transaction
    })

    transaction.commit()
  } catch (error) {
    transaction.rollback()
    this.warn(error)
    this.throw500()
    return
  }

  notice.setDataValue('option', {
    action: 'acceptFriendRequest'
  })
  notice.save({
    fields: ['option']
  })
  notice.option = {
    action: 'acceptFriendRequest'
  }

  yield socketNotice.emitNotice('acceptFriendRequest', targetUser, user)

  this.body = notice
})

router.get('destroy', function * () {
  this.checkAuth()
  this.required('id')

  if (this.user.id === this.query.id) {
    this.throw400('无法移除自己')
    return
  }

  if (this.request.query.id === this.user.id) {
    this.throw403('id')
  }

  var user = yield db.User.findById(this.request.query.id, {
    attributes: {
      include: [
        [sequelize.fn('array_exist_id', sequelize.col('relation'), this.user.id), 'isFriend'],
        [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('relation'), 1), 0), 'friendCount']
      ]
    }
  })

  if (!user) {
    this.throw404(this.query.id)
    return
  }

  var targetUser = yield db.User.findById(this.user.id, {
    attributes: {
      include: [
        [sequelize.fn('array_exist_id', sequelize.col('relation'), this.query.id), 'isFriend']
      ]
    }
  })

  if (user.dataValues.isFriend !== targetUser.dataValues.isFriend) {
    this.throw500('isFriend')
    return
  }

  if (!user.dataValues.isFriend || !targetUser.dataValues.isFriend) {
    this.throw403('你们并非好友关系')
    return
  }

  var transaction = yield db.sequelize.transaction()
  user.setDataValue('relation', sequelize.fn('array_remove', sequelize.col('relation'), Number(targetUser.id)))
  targetUser.setDataValue('relation', sequelize.fn('array_remove', sequelize.col('relation'), Number(user.id)))

  try {
    yield user.save({
      fields: ['relation'],
      transaction: transaction
    })

    yield targetUser.save({
      fields: ['relation'],
      transaction: transaction
    })

    transaction.commit()
  } catch (error) {
    transaction.rollback()
    this.warn(error)
    this.throw500()
    return
  }

  this.body = user
})

router.get('show', function * () {
  if (this.request.query.id || this.user) {
    var page = this.pagingSlice(this.query.index)

    var user = yield db.User.findById(this.request.query.id || this.user.id, {
      population: {
        model: 'user',
        col: 'relation'
      },
      attributes: {
        include: [
          [sequelize.fn('array_slice_id', sequelize.col('relation'), page.slice[0], page.slice[1]), 'relation'],
          [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('relation'), 1), 0), 'relationCount']
        ]
      }
    })

    if (!user) {
      this.throw404(this.request.query.id)
      return
    }

    this.pagingPointer(this.query.index, user, 'relation')
    this.body = user
  } else {
    this.checkAuth()
  }
})

module.exports = router
