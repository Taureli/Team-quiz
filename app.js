var express = require('express');
var session = require('express-session');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var less = require('less-middleware');
var fs = require('fs');

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();

//moje zmienne
var rooms = ["Room0", "Room1"];	//Tu będą zapisywane wszystkie istniejące pokoje
var usersInRoom = [0, 0];		//Przechowuje liczbe graczy w danym pokoju
var usernames = [];		//Do zapisywania nazw wszystkich użytkowników

var redTeam = {};		//Do przechowywania informacji kto jest w jakiej
var blueTeam = {};		//drużynie w danym pokoju
//Tworzę tablice dla defaultowych pokoi:
redTeam[0] = [];
blueTeam[0] = [];
redTeam[1] = [];
blueTeam[1] = [];

var redPoints = [];		//Przechowuje punkty drużyn
var bluePoints = [];	//w danym pokoju
redPoints[0] = 0;
redPoints[1] = 0;
bluePoints[0] = 0;
bluePoints[1] = 0;

//potrzebne do bezpiecznego połączenia:
var privateKey = fs.readFileSync('cert/privatekey.pem').toString();
var certificate = fs.readFileSync('cert/certificate.pem').toString();

var credentials = {key: privateKey, cert: certificate};

//socket.io
var server = require('https').createServer(credentials, app);
var io = require('socket.io').listen(server);
server.listen(3000, function () {
    console.log('Serwer działa na porcie 3000');
});

//Roomdata (do zmiennych dla pokoi)
var roomdata = require('roomdata');

//Passport
var connect = require('connect');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var passportSocketIo = require('passport.socketio');
var sessionStore = new connect.session.MemoryStore();
var sessionSecret = 'itsasecret';
var sessionKey = 'connect.sid';

//REDIS
var redis = require('redis'),
    client = redis.createClient();

client.on('error', function (err) {
    console.log('Error ' + err);
});

//MD5
var md5 = require('MD5');

//--------------------Konfiguracja passport.js-------------------
passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (obj, done) {
    done(null, obj);
});

passport.use(new LocalStrategy(
    function (username, password, done) {

    	client.hget(username, "password", function(err, reply){
    		if(reply === password){
    			console.log("Udane logowanie...");
	            return done(null, {
	                username: username,
	                password: password
	            });
    		} else {
    			return done(null, false);
      		}
    	});
    }
));

app.use(cookieParser());
app.use(session({
    store: sessionStore,
    key: sessionKey,
    secret: sessionSecret
}));
app.use(passport.initialize());
app.use(passport.session());
//---------------------------------------------------------------

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

//-------------Autoryzacja-----------
var onAuthorizeSuccess = function (data, accept) {
    console.log('Udane połączenie z socket.io');
    accept(null, true);
};

var onAuthorizeFail = function (data, message, error, accept) {
    if (error) {
        throw new Error(message);
    }
    console.log('Nieudane połączenie z socket.io:', message);
    accept(null, false);
};

io.set('authorization', passportSocketIo.authorize({
    passport: passport,
    cookieParser: cookieParser,
    key: sessionKey, // nazwa ciasteczka
    secret: sessionSecret,
    store: sessionStore,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail
}));

//-------------------------------------- 

app.use('/', routes);
app.use('/users', users);

//Dodatkowe ścieżki:
app.use(express.static(path.join(__dirname, 'views')));
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

//Dodaje gracza do drużyny i wysyła informację
var addPlayer = function (socket){

	//Zwiększam ilość osób w pokoju
	usersInRoom[socket.room]++;
	//I wyświetlam wszystkim
	io.sockets.emit('showRooms', rooms, usersInRoom);
	
	//Dopisuję użytkownika do drużyny, gdzie jest mniej osób
	if(blueTeam[socket.room].length > redTeam[socket.room].length){
		redTeam[socket.room].push(socket.username);
		socket.team = "red";
	} else {
		blueTeam[socket.room].push(socket.username);
		socket.team = "blue";
	}

	//Pokazuje ilość punktów
	socket.emit('punkty', redPoints[socket.room], bluePoints[socket.room]);

	//Wiadomość w czacie
	var temp = " * Użytkownik " + socket.username + " dołączył do pokoju " + socket.room;
	console.log("SENT %s", temp);
	io.sockets.in(socket.room).emit('joined left', blueTeam[socket.room], redTeam[socket.room], temp);

};

//Usuwa gracza z drużyny i informuje w pokoju, że user wyszedł
var removePlayer = function (team, room, name){
	if(team == "blue"){
		for(var i = 0; i < blueTeam[room].length; i++){
			if(blueTeam[room][i] == name){
				temp1 = blueTeam[room].slice(0,i);
				temp2 = blueTeam[room].slice(i + 1,blueTeam[room].length);
				temp3 = temp1.concat(temp2);
				blueTeam[room] = temp3;
			}
		}
	} else {
		for(var i = 0; i < redTeam[room].length; i++){
			if(redTeam[room][i] == name){
				temp1 = redTeam[room].slice(0,i);
				temp2 = redTeam[room].slice(i + 1,redTeam[room].length);
				temp3 = temp1.concat(temp2);
				redTeam[room] = temp3;
			}
		}
	}

	//Zmniejszam ilość osób w pokoju
	usersInRoom[room]--;
	//I wyświetlam wszystkim
	io.sockets.emit('showRooms', rooms, usersInRoom);

	var temp = " * Użytkownik " + name + " wyszedł z pokoju " + room;
	console.log("SENT %s", temp);
	io.sockets.in(room).emit('joined left', blueTeam[room], redTeam[room], temp);

};

//Zwraca losową liczbę z podanego przedziału
var randomInt = function (min, max){
	return Math.floor(Math.random() * (max - min + 1)) + min;
};

var nextQuestion = function (socket){

	//Pobieram pytanie z bazy i wyświetlam pytanie
	client.get("questions", function(err, reply){

		var allQuestions = JSON.parse(reply);

		//losowe pytanie
		rand = randomInt(0, allQuestions.questions.length);

		pytanie = allQuestions.questions[rand].question;

		ansa = allQuestions.questions[rand].a;
		ansb = allQuestions.questions[rand].b;
		ansc = allQuestions.questions[rand].c;
		ansd = allQuestions.questions[rand].d;

		socket.correct = allQuestions.questions[rand].correct;

		console.log("PYTANIE %s", JSON.stringify(pytanie));

		socket.emit('show question', pytanie, ansa, ansb, ansc, ansd);

	});		

};

var addPoints = function (socket){

	if(socket.team === "red"){
		redPoints[socket.room]++;
	} else {
		bluePoints[socket.room]++;
	}

	io.sockets.in(socket.room).emit('punkty', redPoints[socket.room], bluePoints[socket.room]);

	//Sprawdzam czy któraś drużyna wygrała
	if(redPoints[socket.room] === 5) {
		io.sockets.in(socket.room).emit('wygrana', "red");
	} else if(bluePoints[socket.room] === 5) {
		io.sockets.in(socket.room).emit('wygrana', "blue");
	} else {
		//Jak nie, to następne pytanie
		nextQuestion(socket);
	}

};

var takePoints = function (socket){

	if(socket.team === "red"){
		redPoints[socket.room]--;
	} else {
		bluePoints[socket.room]--;
	}

	io.sockets.in(socket.room).emit('punkty', redPoints[socket.room], bluePoints[socket.room]);

	//następne pytanie
	nextQuestion(socket);

};

io.sockets.on('connection', function (socket) {

	socket.username = socket.handshake.user.username;

	//client.bgsave();

	//Wyświetlanie istniejących pokoi po podłączeniu:
	socket.emit('showRooms', rooms, usersInRoom);
	socket.emit('showName', socket.username);
	
	socket.on('create room', function(data){
		usersInRoom.push(0);
		temp = rooms.push(data);	//temp przechowuje ilosc elementow w tablicy rooms
		redTeam[temp - 1] = [];
		blueTeam[temp - 1] = [];
		io.sockets.emit('showRooms', rooms, usersInRoom);
	});
	
	socket.on('join room', function(data){
	
		socket.room = data;
		socket.join(data);

		//Dodaję gracza do pokoju i drużyny
		addPlayer(socket);

		//Wyświetlam pytanie
		nextQuestion(socket);
		
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

		//usuwam użytkownika z zespołu i pokoju:
		removePlayer(tempTeam, tempRoom, socket.username);
		
	});

	socket.on('check answer', function(data){

		console.log("correct: " + socket.correct + " / pressed: " + data);

		if(socket.correct === data){
			addPoints(socket);
		} else {
			takePoints(socket);
		}

	});
	
	
});

module.exports = app;
