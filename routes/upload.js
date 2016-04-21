var router = require('koa-router')({
  prefix: '/upload/'
})
// var koa= require('koa')
// var parse = require('co-busboy')
// var fs = require('fs')
var qiniu = require('qiniu')
// 需要填写你的 Access Key 和 Secret Key
qiniu.conf.ACCESS_KEY = 'w8wLk3Bx4BmVSz2tCG6gRTTyiCGiSnIMqYvMvMiM'
qiniu.conf.SECRET_KEY = 'YZ7q2mpTywxLFRm31H9fnfmtyY1eS8JRuccFq9oI'
// 要上传的空间
var bucket = 'node'
// 上传到七牛后保存的文件名

// 构建上传策略函数，设置回调的url以及需要回调给业务服务器的数据
// function uptoken(bucket, key) {

//   return putPolicy.token()
// }

router.get('getToken', function *() {
  var key = Date.now() * 1000
  var putPolicy = new qiniu.rs.PutPolicy(bucket + ':' + key)
  putPolicy.fsizeLimit = 1024 * 1024 * 5

  var valueses = {}
  valueses.key = key
  valueses.token = putPolicy.token()
  this.body = valueses
})

// router.post('uploadPic', function*() {
//     if ('POST' != this.method) return yield next
//     // multipart upload
//     var parser = parse(this)
//     var part
//     var pic = []
//     while (part = yield parser) {
//         var extName = '' //后缀名
//         switch (part.mimeType) {
//             case 'image/pjpeg':
//                 extName = 'jpg'
//                 break
//             case 'image/jpeg':
//                 extName = 'jpg'
//                 break
//             case 'image/png':
//                 extName = 'png'
//                 break
//             case 'image/x-png':
//                 extName = 'png'
//                 break
//         }
//         if (extName.length != 0) //格式对的时候
//         {
//             var name = Date.now() * 1000 + "." + extName
//             var stream = fs.createWriteStream('./photo/' + name)
//             part.pipe(stream)
//             pic.push(name)

//             // console.log('uploading %s -> %s', part.filename, stream.path)
//         } else {
//             this.throw500("格式错误")
//         }
//     }
//     this.body = pic

// })

module.exports = router
