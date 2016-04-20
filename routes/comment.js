var db = require('./../codes/db');
var socketNotice = require('./../sockets/notice');
var router = require('koa-router')({
    prefix: '/comment/'
});
var sequelize = require('sequelize');
router.get('publish', function* () {

    this.checkAuth();
    if (this.request.query == undefined || this.request.query.id == undefined) {
        this.throw412();
    }
    var comment = yield db.Comment.create({
        status: this.request.query.id,
        content: this.request.query.content,
        longitude: this.request.query.longitude,
        latitude: this.request.query.latitude,
        user: this.user.id,
    });

    var status = yield db.Status.findById(comment.status);

    if (status) {
        status.setDataValue("comment", sequelize.fn('array_cat', sequelize.col("comment"), [parseInt(comment.id)]));
        yield status.save({ fields: ['comment'] });
        delete status.dataValues['comment'];
        comment.status = status;
        comment.user = yield db.User.findById(this.user.id);
        if (this.user.id != status.user) {
            // yield db.Notify.create({
            //     type: "comment", //评论
            //     state: false,
            //     user: this.user.id,
            //     targetUser: status.user,
            //     comment: comment.id,
            //     status: status.id
            // }); //TODO:待定
            // if(routesSocket[status.user]!=undefined){
            //     var temp=yield routesNotify.unread(status.user);
            //       routesSocket[status.user].emit('show',temp);
            // }
            yield socketNotice.emitNotice("comment", this.user.id, status.user, comment.id, status.id);
        }
        this.body = comment;
    } else {
        yield comment.destroy({ id: status.id }).then(function(u) {
            console.log(u);
        });
        this.throw404();
    }
});

router.get('reply', function* () {
    this.checkAuth();
    if (this.request.query == undefined || this.request.query.id == undefined || this.request.query.target == undefined) {
        this.throw412();
    }

    var status = yield db.Status.findById(this.request.query.id, {
        population: { model: "user", col: "user" }
    });

    var target = yield db.Comment.findById(this.request.query.target, {
        population: { model: "user", col: "user" }
    });

    var user = yield db.User.findById(this.user.id);

    if (status && target) {
        var comment = yield db.Comment.create({
            status: this.request.query.id,
            content: this.request.query.content,
            longitude: this.request.query.longitude,
            latitude: this.request.query.latitude,
            user: this.user.id,
            target: this.request.query.target
        });

        status.setDataValue("comment", sequelize.fn('array_cat', sequelize.col("comment"), [parseInt(comment.id)]));
        yield status.save({ fields: ['comment'] });
        delete status.dataValues['comment'];

        comment.status = status;
        comment.target = target;
        comment.user = user;

        if (this.user.id != target.user.id) {
            // yield db.Notify.create({
            //     type: "reply", //回复
            //     state: false,
            //     user: this.user.id,
            //     targetUser: target.user.id, //目标用户
            //     comment: this.request.query.target, //
            //     status: status.id,
            //     reply: comment.id
            // });
            // if(routesSocket[target.user.id]!=undefined){
            //       var temp=yield routesNotify.unread(target.user.id);
            //       routesSocket[target.user.id].emit('show',temp);
            // }
            yield socketNotice.emitNotice("reply", this.user.id, target.user.id, this.request.query.target, status.id, comment.id);
        }
        this.body = comment;

    } else {
        this.throw404();
    }
});

module.exports = router;
