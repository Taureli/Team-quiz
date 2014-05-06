var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var less = require('less-middleware');

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();

//moje zmienne
var rooms = ["Room0", "Room1"];

//socket.io
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
server.listen(3000, function () {
    console.log('Serwer działa na porcie 3000');
});

//Roomdata (do zmiennych dla pokoi)
var roomdata = require('roomdata');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

//Dodatkowe ścieżki:
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'bower_components/jquery/dist')));
app.use(express.static(path.join(__dirname, 'bower_components/bootstrap/dist/css')));
app.use(express.static(path.join(__dirname, 'bower_components/bootstrap/dist/fonts')));
app.use(express.static(path.join(__dirname, 'bower_components/bootstrap/dist/js')));

app.use(less({
	src: path.join(__dirname, 'less'),
	dest: path.join(__dirname, 'public/stylesheets'),
	prefix: '/stylesheets',
	compress: true
}));

/// catch 404 and forwarding to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


//--------------GŁÓWNY-KOD-------------

io.sockets.on('connection', function (socket) {

	//Wyświetlanie istniejących pokoi po podłączeniu:
	io.sockets.emit('showRooms', rooms);
	
	socket.on('create room', function(data){
		rooms.push(data);
		io.sockets.emit('showRooms', rooms);
	});
	
	socket.on('join room', function(data){
		socket.room = data;
		socket.join(data);
		
		var temp = " * Użytkownik " + socket.username + " dołączył do pokoju " + socket.room;
		console.log("SENT %s", temp);
	});
	
	
});

module.exports = app;
