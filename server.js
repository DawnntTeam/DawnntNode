const app = require('koa.io')()
const router = require('koa-router')()

const injection = require('./codes/injection')
const auth = require('./codes/auth')
const routerAccount = require('./routes/account')
const routerUser = require('./routes/user')
const routerStatus = require('./routes/status')
const routerComment = require('./routes/comment')
const routerRelation = require('./routes/relation')
const routerLike = require('./routes/like')
const routerNotice = require('./routes/notice')
const routerUpload = require('./routes/upload')
const routerAlbum = require('./routes/album')
const socketNotice = require('./sockets/notice')

router.get('/', function * (next) {
  this.body = 'version 1.2.1.3.4.42.3.42.1.2354'
})

app.on('error', function (error, context) {
  context.status = 200
  context.length = Buffer.byteLength(error.message)
  context.set('Content-Type', 'application/json; charset=utf-8')
  context.res.end(error.message, 'utf-8')
})

app
  .use(injection)
  .use(auth)
  .use(router.routes())
  .use(routerAccount.routes())
  .use(routerUser.routes())
  .use(routerStatus.routes())
  .use(routerLike.routes())
  .use(routerComment.routes())
  .use(routerRelation.routes())
  .use(routerNotice.routes())
  .use(routerUpload.routes())
  .use(routerAlbum.routes())
  .use(router.allowedMethods())

socketNotice.routes(app.io)
app.listen(process.env.PORT || 3000)
