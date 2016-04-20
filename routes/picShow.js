var router = require('koa-router')({
    prefix: '/picShow/'
});
var fs = require('fs');
var path = require('path');
var extname = path.extname;

router.get('show', function* () {

    this.required("id");
    var path = "./photo/" + this.query.id;

    var fstat = yield

    function(done) {
        fs.stat(path, done);
    };
    if (fstat.isFile()) {
        this.type = extname(path);
        this.body = fs.createReadStream(path);
    }

});

module.exports = router;
