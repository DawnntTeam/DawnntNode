var db = require('./../codes/db');
var socketNotice = require('./../sockets/notice');
var router = require('koa-router')({
    prefix: '/relation/'
});
var sequelize = require('sequelize');


//好友申请
router.get('friendRequest', function* () {
    this.checkAuth();
    this.required("id");

    var user = yield db.User.findById(this.query.id, {
        attributes: {
            include: [
                [sequelize.fn('array_exist_id', sequelize.col('relation'), this.user.id), 'isFriend'],
                [sequelize.fn('array_exist_id', sequelize.col('black'), this.user.id), 'isBlack']
                // [sequelize.col('relation'), "relation"]
            ]
        }
    });
    //验证是否是黑名单
    if (user) {
        if (user.dataValues.isFriend) {
            this.throw400("该用户已经是你的好友");
        }
        if (!user.dataValues.isBlack) {
            if (this.user.id != this.query.id) {
                //验证是否已经有过申请
                var NotifyOld = yield db.Notify.findOne({ where: { user: this.user.id, targetUser: this.query.id, state: false } });

                if (NotifyOld) {
                    this.throw400("您已经发起过对该用户的好友申请");
                }
                // yield db.Notify.create({
                //     type: "friendRequest",
                //     state: false,
                //     user: this.user.id,
                //     targetUser: this.query.id
                // });
                // if(routesSocket[this.query.id]!=undefined){
                //         var temp = yield  routesNotify.unread(this.query.id);
                //         routesSocket[this.query.id].emit('show',temp);
                // } 
                yield socketNotice.emitNotice("friendRequest", this.user.id, this.query.id);
            }
            this.body = { isSuccess: true };
        } else {
            this.throw400("该用户已经把你加入黑名单");
        }
    } else {
        this.throw400("用户不存在");
    }
});


//拒绝好友申请
router.get('refuseFriendRequest', function* () {
    this.checkAuth();
    this.required("id");
    // this.required("targetUser");
    var notify = yield db.Notify.findById(this.query.id);
    if (notify.user == this.user.id)
        this.throw403("目标用户与发起申请用户相同");
    notify.setDataValue("option", { action: "refuseFriendRequest" });
    notify.save({ fields: ['option'] });
    notify.option = { action: "refuseFriendRequest" };
    if (notify.targetUser != notify.user) {
        //     var temp = yield db.Notify.create({
        //         type: "refuseFriendRequest",
        //         state: false,
        //         user: notify.targetUser,
        //         targetUser: notify.user
        //     });
        //    if(routesSocket[notify.user]!=undefined){
        //         var temp = yield  routesNotify.unread(notify.user);;
        //         routesSocket[notify.user].emit('show',temp);
        //    }
        yield socketNotice.emitNotice("refuseFriendRequest", notify.targetUser, notify.user);
    }
    this.body = notify;
});

//同意好友申请
router.get('theFriendRequest', function* () {
    this.checkAuth();
    this.required("id");
    // this.required("targetUser");
    var notify = yield db.Notify.findById(this.query.id);
    //user 1 申请+ targetUser 2  为好友  

    if (notify.user == this.user.id)
        this.throw403("User");

    var user;

    var userid = parseInt(this.user.id);
    var id = parseInt(notify.user);
    var noid = this.query.id;
    yield db.sequelize.transaction().then(function(t) {
        return db.User.findById(id, {
            attributes: {
                include: [
                    [sequelize.fn('array_exist_id', sequelize.col('relation'), userid), 'isFriend'],
                    [sequelize.fn('array_exist_id', sequelize.col('black'), userid), 'isBlack'],
                    [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('relation'), 1), 0), 'friendCount']
                    // [sequelize.col('relation'), "relation"]
                ]
            },
            transaction: t
        }).then(function(applicant) {
            //申请人的好友列表中没有被申请的人的时候才会执行  已经添加的这不必要执行(理论上是不会出现在好友列表中，但是有可能会 )
            if (!applicant.dataValues.isFriend) { //将被申请人加入申请人好友中
                applicant.setDataValue("relation", sequelize.fn('array_cat', sequelize.col("relation"), [userid]));
                return applicant.save({ fields: ['relation'], transaction: t }).then(function() {
                    delete applicant.dataValues['relation'];
                    applicant.dataValues.friendCount = applicant.dataValues.friendCount + 1;
                    user = applicant;
                    if (applicant.dataValues.isBlack) //如果被申请人在申请人的黑名单中则自动移出
                    {
                        applicant.setDataValue("black", sequelize.fn('array_remove', sequelize.col("black"), userid));
                        return applicant.save({ fields: ['black'], transaction: t });
                    }
                })
            }
        }).then(function(tt) {
            return Promise.all([db.User.findById(userid, {
                attributes: {
                    include: [
                        [sequelize.fn('array_exist_id', sequelize.col('relation'), id), 'isFriend'],
                        [sequelize.fn('array_exist_id', sequelize.col('black'), id), 'isBlack']
                        // [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('relation'), 1), 0), 'friendCount']
                        // [sequelize.col('relation'), "relation"]
                    ]
                },
                transaction: t
            }).then(function(agreeApplicant) {
                //(理论上是不会出现在好友列表中，但是有可能会 在执行过程中意外情况)
                if (!agreeApplicant.dataValues.isFriend) { //将申请人加入被申请人好友中
                    agreeApplicant.setDataValue("relation", sequelize.fn('array_cat', sequelize.col("relation"), [id]));
                    return agreeApplicant.save({ fields: ['relation'], transaction: t }).then(function() {
                        delete agreeApplicant.dataValues['relation'];
                        //（这种情况理论上不会出现 因为在上面已经做过验证 但是有一些特殊情况恶意的  可能会造成这种情况）    
                        if (agreeApplicant.dataValues.isBlack) //如果申请人在被申请人的黑名单中则自动移出
                        {
                            agreeApplicant.setDataValue("black", sequelize.fn('array_remove', sequelize.col("black"), id));
                            return agreeApplicant.save({ fields: ['black'], transaction: t });
                        }
                    });
                }
            })]).then(function() {
                notify.setDataValue("option", { action: "theFriendRequest" });
                notify.save({ fields: ['option'] });
                notify.option = { action: "theFriendRequest" };
                //    if(userid!=id) {
                //         ///添加一条同意的信息    
                //         db.Notify.create({
                //             type: "theFriendRequest",
                //             state: false,
                //             user: userid,//被申请人
                //             targetUser: id//申请人
                //         });                            
                //    }
                t.commit();

            })
                .catch(function(err) {
                    t.rollback();
                    notify = {};
                    // console.log(err);
                })
        })
    });
    if (userid != id && notify != null && notify != {}) {
        yield socketNotice.emitNotice("theFriendRequest", userid, id);
    }
    //  if(notify!=null&&notify!={}&&routesSocket[id]!=undefined){
    //         var temp=yield routesNotify.unread(id);
    //        routesSocket[id].emit('show',routesSocket);
    //  }       
    this.body = notify; //
});

// router.get('create', function*() {
//     this.checkAuth();
//     this.required("id");
//     if (this.request.query.id == this.user.id)
//         this.throw403("id");
//     var friend = yield db.User.findById(this.request.query.id, {
//         attributes: {
//             include: [
//                 [sequelize.fn('array_exist_id', sequelize.col('black'), this.user.id), 'isBlack'],
//                 [sequelize.fn('array_exist_id', sequelize.col('relation'), this.user.id), 'isFriend'],
//                 [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('relation'), 1), 0), 'friendCount']
//                 // [sequelize.col('relation'), "relation"]
//             ]
//         }
//     });
//     var user = yield db.User.findById(this.user.id, {
//         attributes: {
//             include: [
//                 [sequelize.fn('array_exist_id', sequelize.col('relation'), friend.id), 'isFriend'],
//                 [sequelize.fn('array_exist_id', sequelize.col('black'), friend.id), 'isBlack'],
//                 [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('relation'), 1), 0), 'friendCount']
//                 // [sequelize.col('relation'), "relation"]
//             ]
//         }
//     });
//     if (!friend.dataValues.isBlack) //对方是没有将自己加入黑名单
//     {
//         if (!friend.dataValues.isFriend) { //对放是否已经将自己加为好友过 没有则执行 将自己放入对放的好友中
//             // friend.relation.push(this.user.id);
//             // yield friend.update({ relation: friend.relation });
//             friend.setDataValue("relation",sequelize.fn('array_cat',sequelize.col("relation"),this.user.id));
//             yield friend.save({fields:['relation']});           
//             friend.dataValues.friendCount = (friend.dataValues.friendCount || 0) + 1;

//         }

//         try {
//             if (!user.dataValues.isFriend) {
//                 if (user.dataValues.isBlack) { //如果发起用户已经把用户添加到黑名单则自动移除黑名单
//                     // user.relation.push(friend.id);
//                     // yield user.update({ relation: user.relation, black: user.black });
//                     // user.black.remove(friend.id);
//                     user.setDataValue("relation",sequelize.fn('array_cat',sequelize.col("relation"),friend.id));
//                     yield user.save({fields:['relation']});

//                     user.setDataValue("black",sequelize.fn('array_cat',sequelize.col("black"),friend.id));
//                     yield delete user.dataValues["black"];

//                     user.dataValues.friendCount = (user.dataValues.friendCount || 0) + 1;

//                 } else {
//                     // user.relation.push(friend.id);
//                     // yield user.update({ relation: user.relation });
//                     user.setDataValue("relation",sequelize.fn('array_cat',sequelize.col("relation"),friend.id));
//                     yield user.save({fields:['relation']});

//                     user.dataValues.friendCount = (user.relation.length || 0) + 1;

//                 }
//                 //添加一条通知
//                 try {
//                     yield db.Notify.create({
//                         type: "theFriendRequests",
//                         state: false,
//                         user: this.user.id,
//                         targetUser: friend.id
//                     });
//                 } catch (err) {
//                     throw err;
//                 }
//             } else {
//                 this.throw400("该用户已经是你的好友");
//             }
//             this.body = friend;
//         } catch (err) {
//             friend.relation.remove(this.user.id);
//             friend.dataValues.friendCount = (friend.dataValues.friendCount || 0) - 1;
//             yield friend.update({ relation: friend.relation });
//             throw err;
//         }
//     } else {
//         this.throw400("该用户已经把你加入黑名单");
//     }
// });

router.get('destroy', function* () {
    this.checkAuth();
    this.required("id");
    if (this.request.query.id == this.user.id)
        this.throw403("id");
    var friend = yield db.User.findById(this.request.query.id, {
        attributes: {
            include: [
                [sequelize.fn('array_exist_id', sequelize.col('relation'), this.user.id), 'isFriend'],
                [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('relation'), 1), 0), 'friendCount']
                // [sequelize.col('relation'), "relation"]
            ]
        }
    });
    var user = yield db.User.findById(this.user.id, {
        attributes: {
            include: [
                [sequelize.fn('array_exist_id', sequelize.col('relation'), friend.id), 'isFriend']
                // [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('relation'), 1), 0), 'friendCount']
                // [sequelize.col('relation'), "relation"]
            ]
        }
    });

    if (!friend.dataValues.isFriend && !user.dataValues.isFriend) {

        this.throw400("该用户已经不是您的好友！");
    }

    if (friend.dataValues.isFriend) {
        // friend.relation.remove(this.user.id);
        // yield friend.update({ relation: friend.relation });
        friend.dataValues.friendCount = (friend.dataValues.friendCount || 0) - 1;
        friend.setDataValue("relation", sequelize.fn('array_remove', sequelize.col("relation"), this.user.id));
        yield friend.save({ fields: ['relation'] });
        delete friend.dataValues['relation'];


    }
    if (user.dataValues.isFriend) {
        // yield user.update({ relation: user.relation });
        // user.relation.remove(friend.id);

        // user.dataValues.friendCount = (user.dataValues.friendCount || 0) - 1;
        user.setDataValue("relation", sequelize.fn('array_remove', sequelize.col("relation"), friend.id));
        yield user.save({ fields: ['relation'] });
        // delete user.dataValues['relation'];        

    }

    this.body = friend;
});

router.get('show', function* () {
    var page = this.pagingSlice(this.query.index);
    if (this.request.query.id || this.user) {
        var user = yield db.User.findById(this.request.query.id || this.user.id, {
            population: { model: "user", col: "relation" },
            attributes: {
                include: [
                    [sequelize.fn('array_slice_id', sequelize.col('relation'), page.slice[0], page.slice[1]), 'relation'],
                    [sequelize.fn('COALESCE', sequelize.fn('array_length', sequelize.col('relation'), 1), 0), 'relationCount']
                ]
            }
        });
        if (user) {
            this.pagingPointer(this.query.index, user, "relation");
            this.body = user;
        } else
            this.throw404("id");
    } else
        this.checkAuth();
});

module.exports = router;
