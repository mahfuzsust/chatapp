var express = require("express");
var path = require("path");
var bcrypt = require('bcryptjs');
var mongoose = require("mongoose");
const bodyParser = require("body-parser");
const model = require("./models/model");
var cookieEncrypter = require("cookie-encrypter");
var cookieParser = require('cookie-parser');
var session = require('express-session');
var config = require("./config");
var jwt = require('jsonwebtoken');
var async = require("async");
var ObjectID = require('mongodb').ObjectID;
var app = express();
var http = require("http").Server(app)
var io= require("socket.io")(http)

app.set('secret', config.secret);

app.use(express.static('public'));

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

app.use(cookieParser(app.get('secret')));

connectDB();

var isAuthenticated = function(req) {
    var token = req.headers['x-access-token'] || req.cookies['chat_app_token'];
    if (token) {
        const checkDecoded = function (err, decoded) {
            if (err) {
                return false;
            }
            else {
                if(decoded && decoded.data && decoded.data.userId)
                {
                    req.userId = decoded.data.userId;
                    
                }
                return true;
            }
        };
        jwt.verify(token, app.get('secret'), checkDecoded);

        return checkDecoded();
    } else {
        return false;
    }
};

app.get("/", (req, res) => {
    if(isAuthenticated(req)) {
        res.sendFile(path.join(__dirname, "public", "dashboard.html"));
    } else {
        res.redirect('/login');
    }
});

app.get("/logout", (req, res) => {
    res.clearCookie('chat_app_token');
    res.redirect('/login');
});

app.get("/login", (req, res) => {
    if(isAuthenticated(req)) {
        res.redirect('/');
    } else {
        res.sendFile(path.join(__dirname, "public", "login.html"));
    }
});
app.post("/login", (req, res) => {
    model.User.findOne({username: req.body.username}, function(err, user) {
        if(err) throw err;
        if(!user) {
            res.status(400).json({ success: false, message: 'Authentication failed. User not found.' });
        } else {
            bcrypt.compare(req.body.password, user.password, function(err, isMatched) {
                if(isMatched == false) {
                    res.status(400).json({ success: false, message: 'Password do not match' });
                    return;
                } else {
                    var token = jwt.sign({
                        data: {userId: user._id}
                    }, app.get("secret") , { expiresIn: 60 * 60 });   
                    
                    req.headers['x-access-token'] = token;
                    //req.session.accessToken = token;
                    res.cookie('chat_app_token', token, { maxAge: 900000, httpOnly: true });
                    res.send({token: token, userId: user._id});
                }
            });
        }
    });
});
app.get("/signup", (req, res) => {
    if(isAuthenticated(req)) {
        res.redirect('/');
    } else {
        res.sendFile(path.join(__dirname, "public", "signup.html"));
    }
});
app.post("/signup", (req, res) => {
    try {
        var info = {
            username: req.body.username
        }
        bcrypt.genSalt(10, function(err, salt) {
            bcrypt.hash(req.body.password, salt, function(err, hash) {
                info["password"] = hash;
                var user = new model.User(info);
                user.save();
                res.sendStatus(200);
            });
        });
    } catch (error) {
        res.sendStatus(500)
        console.error(error)
    }
});

app.post("/connect", (req, res) => {
    if(!isAuthenticated(req)) {
        res.redirect('/login');
    } 
    try {
        var connection = {
            requestedBy: req.userId,
            connection: req.body.connectionId,
        };
        var connect = new model.Connection(connection)
        connect.save()
        res.sendStatus(200)
    } catch (error) {
        res.sendStatus(500)
        console.error(error)
    }
});

app.get("/users", async (req, res) => {
    if(!isAuthenticated(req)) {
        res.redirect('/login');
        return;
    }

    try {
        var query = require('url').parse(req.url,true).query;
        var searchString = query.searchString;

        var userId = new ObjectID(req.userId);
        
        model.User.find(
            {
                "username" : { $regex: searchString, $options: 'i' },
                "_id" : {$ne: userId} 
            }
        ).select('username').exec(function(err, users) {
            if(err) throw err;
            res.send({data: users});
        });
    } catch (error) {
        res.sendStatus(500)
        console.error(error)
    }
});

app.get("/accept/:connection", async (req, res) => {
    if(!isAuthenticated(req)) {
        res.redirect('/login');
    } 
    console.log(req.params.connection);
    model.Connection.update(
        { _id: new ObjectID(req.params.connection) },
        { $set: { isAccepted: true, accepted: Date.now() } }
    ).exec(function(err, update) {
        console.log(err);
        console.log(update);
    })

});

app.get("/connections", async (req, res) => {
    if(!isAuthenticated(req)) {
        res.redirect('/login');
    } 

    try {
        model.Connection.find({
            $or: [
                { requestedBy: req.userId },
                { connection: req.userId }
            ]
        })
        .populate('requestedBy', '-password -created -v')
        .populate('connection', '-password -created -v')
        .exec(function(err, usrs){
            if(err) throw err;
            var arr= [];
            var currentUserId = new ObjectID(req.userId);

            async.each(usrs, function(user, callback) {
                let userId, userName;
                if(currentUserId.equals(user.requestedBy.id) ) {
                    userId = user.connection.id;
                    userName = user.connection.username;
                } else {
                    userId = user.requestedBy.id;
                    userName = user.requestedBy.username;
                }
                arr.push({
                    roomId: user.id,
                    isAccepted: user.isAccepted,
                    userId: userId,
                    name: userName
                });
              }, function(err){
            });
            res.send({data: arr});
        });

    } catch (error) {
        res.sendStatus(500)
        console.error(error)
    }
});

app.post("/chats", async (req, res) => {
    if(!isAuthenticated(req)) {
        res.redirect('/login');
    } 

    try {
        var chatObj = {
            user: req.userId,
            chat: req.body.chat,
            connection: req.body.connection
        };

        var chat = new model.Chat(chatObj);
        await chat.save();
        res.sendStatus(200)

        io.emit("chat:" + req.body.connection, chatObj)
    } catch (error) {
        res.sendStatus(500)
        console.error(error)
    }
});

app.get("/messages/:roomId", (req, res) => {
    if(!isAuthenticated(req)) {
        res.redirect('/login');
    }
    model.Chat.find({connection: req.params.roomId}, (error, chats) => {
        res.send(chats)
    });
});

io.on("connection", (socket) => {
    console.log("Socket is connected...")
});

var port = process.env.PORT || 3000;

var server = http.listen(port, () => {
    console.log("Well done, now I am listening on ", port)
});

function connectDB() {
    mongoose.connect(config.database);
    mongoose.Promise = global.Promise;
    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'MongoDB connection error:'));
}
