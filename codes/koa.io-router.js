const auth = require('./auth');

module.exports = IORouter

function IORouter(opts) {
    if (!(this instanceof IORouter)) {
        return new IORouter(opts);
    }
    this.opts = opts || {};

    this.onlineClient = new Map();
    this.routeSet = new Set();
    this.io;
};

IORouter.prototype.route = function(type, listener) {
    this.routeSet.add({
        type: type,
        listener: listener
    });
};

IORouter.prototype.emit = function(event, message) {
    this.io.emit(event, message);
};

IORouter.prototype.emitById = function(id, event, message) {
    if (this.onlineClient.has(id) && this.io.connected[this.onlineClient.get(id)])
        this.io.connected[this.onlineClient.get(id)].emit(event, message);
};

IORouter.prototype.routes = function(appio) {
    this.io = appio.of(this.opts.of);

    this.io.use(auth);

    var onlineClient = this.onlineClient

    this.io.use(function* (next) {
        onlineClient.set(this.user.id, this.id);
        yield* next;
        onlineClient.delete(this.user.id, this.id);
    })

    this.routeSet.forEach((item) => {
        this.io.route(item.type, item.listener);
    })
    this.routeSet.clear();
    this.routeSet = null;
};
