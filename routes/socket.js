// var user={};
// var socket={};

//  module.exports.connect=function* (next) {
//   if(this.user){
//         // chat[this.user.id]=this;
//         user[this.user.id]=this.id;
//         socket=module.exports.sockets;
//         socket.connected[this.id]=this;
//         // socket.connected[this.id].emit('show','连接成功'+this.user.id);
//         this.emit('show', '连接成功'+this.user.id);
//   }
//   yield* next;
// };

module.exports.user = {}
module.exports.sockets = {}
