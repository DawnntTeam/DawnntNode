const config = require('./../codes/config')
var router = require('koa-router')({
  prefix: '/upload/'
})
var qiniu = require('qiniu')
qiniu.conf.ACCESS_KEY = config.getQiniuConfig().accessKey
qiniu.conf.SECRET_KEY = config.getQiniuConfig().secretKey

router.get('getToken', function * () {
  var key = Date.now() * 1000
  var putPolicy = new qiniu.rs.PutPolicy('node:' + key)
  putPolicy.fsizeLimit = 1024 * 1024 * 5
  this.body = {key: key, token: putPolicy.token()}
})

module.exports = router
