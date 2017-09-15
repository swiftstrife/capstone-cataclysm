// server.js

// set up ======================================================================
// get all the tools we need
var express  = require('express');
var session  = require('express-session');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var app      = express();
var port     = process.env.PORT || 80;
var path = require("path");
var passport = require('passport');
var flash    = require('connect-flash');
var server = require('http').Server(app);

// configuration ===============================================================
// connect to our database

require('./config/passport')(passport); // pass passport for configuration



// set up our express application
app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'views')));

app.set('view engine', 'ejs'); // set up ejs for templating

// required for passport
app.use(session({
	secret: 'huyandlawrence',
	resave: true,
	saveUninitialized: true
 } )); // session secret
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session


// routes ======================================================================
require('./app/routes.js')(app, passport); // load our routes and pass in our app and fully configured passport

// launch ======================================================================
var io = require('socket.io').listen(app.listen(port));
console.log('The magic happens on port ' + port);

// chat ======================================================================
server.lastPlayerID = 0;

io.sockets.on('connection', function (socket) {
    socket.on('newplayer',function(msg){
        socket.player = {
            id: server.lastPlayerID++,
            x: randomInt(100,400),
            y: randomInt(100,400),
            name: msg[0],
            stats: msg[2]
        };
        socket.emit('allplayers',getAllPlayers());
        socket.broadcast.emit('newplayer',socket.player);
        io.emit('new user', msg);
        console.log(socket.player.stats.atk);

        socket.on('click',function(data){
            console.log('click to '+data.x+', '+data.y);
            socket.player.x = data.x;
            socket.player.y = data.y;
            io.emit('move',socket.player);
        });
        socket.on('disconnect', function (msg) {
            io.emit('disconnect', socket.player.name + " has left the room.");
            io.emit('remove',socket.player.id);
        });
    });

    socket.on('chat message', function(msg){
        io.emit('chat message', msg);
    });

});

function getAllPlayers(){
    var players = [];
    Object.keys(io.sockets.connected).forEach(function(socketID){
        var player = io.sockets.connected[socketID].player;
        if(player) players.push(player);
    });
    return players;
}

function randomInt (low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}
