﻿const app = require('koa.io')()
const router = require('koa-router')()

const injection = require('./codes/injection')
const auth = require('./codes/auth')
const routerAccount = require('./routes/account')
const routerUser = require('./routes/user')
const routerStatus = require('./routes/status')
const routerComment = require('./routes/comment')
const routerRelation = require('./routes/relation')
const routerLike = require('./routes/like')
const routerNotify = require('./routes/notify')
const routerUpload = require('./routes/upload')
const routerAlbum = require('./routes/album')
const routerWozaizheer = require('./routes/wozaizheer')
const socketNotice = require('./sockets/notice')

const db=require('./codes/db')
router.get('/', function *(next) {
    this.body = "66688"
     yield db.User.findById(wechatUser.id)
});

app.on('error', function (error, context) {
    context.status = 200;
    context.length = Buffer.byteLength(error.message);
    context.set('Content-Type', 'application/json; charset=utf-8');
    context.res.end(error.message, "utf-8");
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
    .use(routerNotify.routes())
    .use(routerUpload.routes())
    .use(routerAlbum.routes())
    .use(routerWozaizheer.routes())
    .use(router.allowedMethods())

socketNotice.routes(app.io);

app.listen(process.env.port || 1337);
