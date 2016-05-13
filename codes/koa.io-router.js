const auth = require('./auth')

module.exports = IORouter

// opts:{of}
function IORouter (opts) {
  if (!(this instanceof IORouter)) {
    return new IORouter(opts)
  }
  this.opts = opts || {}

  this.onlineClient = new Map()
  this.routeSet = new Set()
  this.io
}

IORouter.prototype.route = function (type, listener) {
  this.routeSet.add({
    type: type,
    listener: listener
  })
}

// 对命名空间下所有的用户发送信息
IORouter.prototype.emit = function (event, message) {
  this.io.emit(event, message)
}

// 根据用户id发送信息id为系统中的用户id
IORouter.prototype.emitById = function (id, event, message) {
  if (this.onlineClient.has(id) && this.io.connected[this.onlineClient.get(id)]) {
    this.io.connected[this.onlineClient.get(id)].emit(event, message)
  }
}

// 初始化方法,为了和io-router统一而使用routes,appio为app.io
IORouter.prototype.routes = function (appio) {
  this.io = appio.of(this.opts.of)

  this.io.use(auth)

  var onlineClient = this.onlineClient

  this.io.use(function * (next) {
    if (this.user) onlineClient.set(this.user.id, this.id)
    yield * next
    if (this.user) onlineClient.delete(this.user.id, this.id)
  })
  // 把所有上线的用户都添加到一个存储,在emitById中可以被调用

  this.routeSet.forEach((item) => {
    this.io.route(item.type, item.listener)
  })
  // 只有初始化的时候才会把route中添加的方法添加添加到app.io
  this.routeSet.clear()
  this.routeSet = null
}
