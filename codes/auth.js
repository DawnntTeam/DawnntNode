var db = require('./db');
var cache = require('memory-cache');

var auth = function* (next) {
    if (this.accept) {
        this.set('Access-Control-Allow-Origin', this.request.accept.headers.origin);
        this.set('Access-Control-Allow-Headers', 'Content-Type');
        this.set('Access-Control-Allow-Credentials', 'true');
        this.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    }

    var token = this.cookies.get("token")
    if (token && token.length == 36) {
        this.user = cache.get(token);
        if (this.user == null) {
            var userToken = yield db.Token.findOne({ where: { token: token } });
            if (userToken != null) {
                var Token_user = yield db.User.findOne({ where: { id: userToken.user } });
                userToken.user = Token_user;
                this.user = userToken.user;
                cache.put(token, this.user, 10 * 60 * 1000);
            } else {
                this.cookies.set('token', null, {
                    httpOnly: true
                });
            }
        }
        //cache会保存10分钟，防止分布式时无法注销
        //如果cache没有数据则会查询数据库
    }
    token = null;
    yield* next;
};

module.exports = auth;
