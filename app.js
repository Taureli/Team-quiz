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
var rooms = ["Room0", "Room1"];	//Tu będą zapisywane wszystkie istniejące pokoje
var usernames = [];		//Do zapisywania nazw wszystkich użytkowników
var redTeam = {};		//Do przechowywania informacji kto jest w jakiej
var blueTeam = {};		//drużynie w danym pokoju
//Tworzę tablice dla defaultowych pokoi:
redTeam[0] = [];
blueTeam[0] = [];
redTeam[1] = [];
blueTeam[1] = [];


//socket.io
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
server.listen(3000, function () {
    console.log('Serwer działa na porcie 3000');
});

//Roomdata (do zmiennych dla pokoi)
var roomdata = require('roomdata');

//REDIS
var redis = require('redis'),
    client = redis.createClient();

client.on('error', function (err) {
    console.log('Error ' + err);
});

//Kompilacja less na css:
app.use(less({
	src: (path.join(__dirname, 'less')),
	dest: (path.join(__dirname, 'public/stylesheets')),
	prefix: '/stylesheets',
	compress: true
}));

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
	socket.emit('choose name');

	//Ustawianie nazwy
	socket.on('check name', function(data){
		if(data == null || data.length < 2){
			socket.emit('choose name');	//Nazwa nie może być pusta
		} else {
			//sprawdzam, czy już jest taka nazwa
			for (var i = 0; i < usernames.length; i++){
				if(usernames[i] == data){
					socket.emit('choose name');
				}
			}

			socket.username = data;
			usernames.push(data);
		}
	});
	
	socket.on('create room', function(data){
		temp = rooms.push(data);	//temp przechowuje ilosc elementow w tablicy rooms
		redTeam[temp - 1] = [];
		blueTeam[temp - 1] = [];
		io.sockets.emit('showRooms', rooms);
	});
	
	socket.on('join room', function(data){
	
		socket.room = data;
		socket.join(data);
		
		//Dopisuję użytkownika do drużyny, gdzie jest mniej osób
		if(blueTeam[socket.room].length > redTeam[socket.room].length){
			redTeam[socket.room].push(socket.username);
			socket.team = "red";
		} else {
			blueTeam[socket.room].push(socket.username);
			socket.team = "blue";
		}

		//Pobieram pytanie z bazy i wyświetlam pytanie
		client.get("questions", function(err, reply){

			var allQuestions = JSON.parse(reply);

			pytanie = allQuestions.questions[0].question;
			ansa = allQuestions.questions[0].a;
			ansb = allQuestions.questions[0].b;
			ansc = allQuestions.questions[0].c;
			ansd = allQuestions.questions[0].d;

			console.log("PYTANIE %s", JSON.stringify(pytanie));

			socket.emit('show question', pytanie, ansa, ansb, ansc, ansd);

		});		
		
		var temp = " * Użytkownik " + socket.username + " dołączył do pokoju " + socket.room;
		console.log("SENT %s", temp);
		io.sockets.in(socket.room).emit('joined left', blueTeam[socket.room], redTeam[socket.room], temp);
	});

	socket.on('send msg', function (data) {
		data = socket.username + ': ' + data;
		console.log("SENT " + JSON.stringify(data));
		io.sockets.in(socket.room).emit('rec msg', data);
	});
	
	socket.on('leave room', function(){
		tempRoom = socket.room;
		tempTeam = socket.team;
		socket.leave(tempRoom);
		socket.room = "";
		socket.team = "";
		
		//usuwam użytkownika z zespołu:
		if(tempTeam == "blue"){
			for(var i = 0; i < blueTeam[tempRoom].length; i++){
				if(blueTeam[tempRoom][i] == socket.username){
					temp1 = blueTeam[tempRoom].slice(0,i);
					temp2 = blueTeam[tempRoom].slice(i + 1,blueTeam[tempRoom].length);
					temp3 = temp1.concat(temp2);
					blueTeam[tempRoom] = temp3;
				}
			}
		} else {
			for(var i = 0; i < redTeam[tempRoom].length; i++){
				if(redTeam[tempRoom][i] == socket.username){
					temp1 = redTeam[tempRoom].slice(0,i);
					temp2 = redTeam[tempRoom].slice(i + 1,redTeam[tempRoom].length);
					temp3 = temp1.concat(temp2);
					redTeam[tempRoom] = temp3;
				}
			}
		}
		
		var temp = " * Użytkownik " + socket.username + " wyszedł z pokoju " + tempRoom;
		console.log("SENT %s", temp);
		io.sockets.in(socket.room).emit('joined left', blueTeam[tempRoom], redTeam[tempRoom], temp);
	});
	
	
});

module.exports = app;
