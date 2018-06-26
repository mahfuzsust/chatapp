var express = require("express");
var path = require("path");
var mongoose = require("mongoose");
const bodyParser = require("body-parser");
const model = require("./models/model");
var cookieEncrypter = require("cookie-encrypter");
var cookieParser = require('cookie-parser');
var session = require('express-session');
var config = require("./config");
var jwt = require('jsonwebtoken');
var async = require("async");
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
app.use(cookieEncrypter(app.get('secret')));
app.use(session({
    secret: app.get('secret'),
    name: "chat_app",
    proxy: true,
    resave: true,
    saveUninitialized: true
}));

connectDB();

var isAuthenticated = function(req) {
    var token = req.session.accessToken || req.headers['x-access-token'];
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
            if(user.password != req.body.password) {
                res.status(400).json({ success: false, message: 'Password do not match' });            
            }
            var token = jwt.sign({
                data: {userId: user._id}
            }, app.get("secret") , { expiresIn: 60 * 60 });   
            
            req.headers['x-access-token'] = token;
            req.session.accessToken = token;
            res.send(token);
            //res.sendStatus(200);
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
        var user = new model.User(req.body)
        user.save()
        res.sendStatus(200)
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
        
        var ObjectID = require('mongodb').ObjectID;

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

app.get("/connections", async (req, res) => {
    if(!isAuthenticated(req)) {
        res.redirect('/login');
    } 

    try {
        model.Connection.find({
            //$and: [
                //{
                    $or: [
                        { requestedBy: req.userId },
                        { connection: req.userId }
                    ]
                //},
                //{ isAccepted : true}
            //]
        })
        .populate('requestedBy', '-password -created -v')
        .populate('connection', '-password -created -v')
        .exec(function(err, usrs){
            if(err) throw err;

            var arr= [];
            
            async.each(usrs, function(user, callback) {
                if(user.requestedBy.id == req.usereId) {
                    arr.push({id: user.connection.id, name: user.connection.username});
                } else {
                    arr.push({id: user.requestedBy.id, name: user.requestedBy.username});
                }
              }, function(err){
            });

            console.log(arr);
            res.send({data: arr});
        });

    } catch (error) {
        res.sendStatus(500)
        console.error(error)
    }
});

app.post("/chats", async (req, res) => {
    try {
        var chat = new model.Chat(req.body)
        await chat.save()
        res.sendStatus(200)

        io.emit("chat", req.body)
    } catch (error) {
        res.sendStatus(500)
        console.error(error)
    }
});
app.get("/chats", (req, res) => {
    model.Chat.find({}, (error, chats) => {
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

/** 
 mmodel.ConnectedUser.find({
            $or: [
                { $and: [
                    {requestType: "personal"},
                    {toId: user._id}
                ] },
                { $and: [
                    {requestType: "admin"},
                    {orgId: { $in: OrgOfAdmin }  }
                ] }
            ]
        })
 .populate('fromId', 'firstName lastName imgSrc')
 .populate('fromOrgId', 'companyName orgDomain logoSrc')
 .populate('orgId', 'companyName orgDomain logoSrc')
 .exec(function (errConnectionRequest, connectionRequest) {
*/