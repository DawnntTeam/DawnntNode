var router = require('koa-router')({
  prefix: '/upload/'
})
var qiniu = require('qiniu')
qiniu.conf.ACCESS_KEY = 'w8wLk3Bx4BmVSz2tCG6gRTTyiCGiSnIMqYvMvMiM'
qiniu.conf.SECRET_KEY = 'YZ7q2mpTywxLFRm31H9fnfmtyY1eS8JRuccFq9oI'

router.get('getToken', function * () {
  var key = Date.now() * 1000
  var putPolicy = new qiniu.rs.PutPolicy('node:' + key)
  putPolicy.fsizeLimit = 1024 * 1024 * 5
  this.body = {key: key, token: putPolicy.token()}
})

module.exports = router
