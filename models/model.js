var mongoose = require("mongoose");

var User = mongoose.model("User", {
    username: String,
    password: String,
    created: { type: Date, default: Date.now },
    updated: { type: Date }
});

var ConnectedUser = mongoose.model("ConnectedUser", {
    requestedBy: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    connection: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    isAccepted: {type: boolean, default: false},
    accepted: {type: Date },
    requested: {type: Date, default: Date.now}
});

var Room = mongoose.model("Room", {
    name: String,
    updated: { type: Date },
    created: { type: Date, default: Date.now },
    createdBy: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    public: {type: Boolean, default: false}
});

var Participant = mongoose.model("Participant", {
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    addedBy: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    room: {type: mongoose.Schema.Types.ObjectId, ref: 'Room'},
    added: { type: Date, default: Date.now }  
});

var Chat = mongoose.model("Chat", {
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    chat: String,
    room: {type: mongoose.Schema.Types.ObjectId, ref: 'Room'},
    updated: { type: Date },
    created: { type: Date, default: Date.now, index: {expires: 60} }
});


exports.User = User;
exports.Chat = Chat;
exports.Room = Room;
exports.Participant = Participant;
exports.ConnectedUser = ConnectedUser;
