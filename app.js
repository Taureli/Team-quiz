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
var rooms = ["Pokój 0", "Pokój 1"];	//Tu będą zapisywane wszystkie istniejące pokoje
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
    client = redis.createClient(17789,"pub-redis-17789.us-east-1-2.1.ec2.garantiadata.com");

    client.auth("superquiz");

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
    		if(reply === md5(password)){
    			console.log("Zalogowano " + username);
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
var addPlayer = function (socket, data){

	socket.room = data;
	socket.join(data);
	socket.points = 0;

	//Zwiększam ilość osób w pokoju
	usersInRoom[socket.room]++;
	//I wyświetlam wszystkim
	io.sockets.emit('showRooms', rooms, usersInRoom);

	var gracz = {"name":socket.username,"points":socket.points};
	
	//Dopisuję użytkownika do drużyny, gdzie jest mniej osób
	if(blueTeam[socket.room].length > redTeam[socket.room].length){
		redTeam[socket.room].push(gracz);
		socket.team = "red";
	} else {
		blueTeam[socket.room].push(gracz);
		socket.team = "blue";
	}

	//Pokazuje ilość punktów
	socket.emit('punkty', redPoints[socket.room], bluePoints[socket.room]);

	//Wiadomość w czacie
	var temp = " * Użytkownik " + socket.username + " dołączył do pokoju " + socket.room;
	console.log("SENT %s", temp);
	io.sockets.in(socket.room).emit('joined left', blueTeam[socket.room], redTeam[socket.room], temp);

	//Wyświetlam pytanie
	nextQuestion(socket);

};

//Usuwa gracza z drużyny i informuje w pokoju, że user wyszedł
var removePlayer = function (team, room, name){
	if(team == "blue"){
		for(var i = 0; i < blueTeam[room].length; i++){
			if(blueTeam[room][i].name == name){
				temp1 = blueTeam[room].slice(0,i);
				temp2 = blueTeam[room].slice(i + 1,blueTeam[room].length);
				temp3 = temp1.concat(temp2);
				blueTeam[room] = temp3;
			}
		}
	} else {
		for(var i = 0; i < redTeam[room].length; i++){
			if(redTeam[room][i].name == name){
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

		//Sprawdzam czy ostatnio nie wylosowano tego samego pytania
		//i ewentualnie powtarzam losowanie
		while(socket.lastq === rand){
			rand = randomInt(0, allQuestions.questions.length);
		}

		//zapamiętuję ostatnie pytanie:
		socket.lastq = rand;

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

	socket.points++;

	//aktualizuję punkty w tablicy
	if(socket.team == "blue"){
		for(var i = 0; i < blueTeam[socket.room].length; i++){
			if(blueTeam[socket.room][i].name === socket.username){
				blueTeam[socket.room][i].points++;
			}
		}
	} else {
		for(var i = 0; i < redTeam[socket.room].length; i++){
			if(redTeam[socket.room][i].name === socket.username){
				redTeam[socket.room][i].points++;
			}
		}
	}

	//Zapisuję punkty użytkownikowi w bazie
	socket.allPunkty++;
	var statystyki = {"allPunkty":socket.allPunkty,"wygrane":socket.wygrane,"przegrane":socket.przegrane};
	var statystyki2 = JSON.stringify(statystyki);

	client.hmset(socket.username, "stats", statystyki2, function(err, reply2){
	   	if(err){
	   		console.log(err);
		} else {
	   		console.log("Zaktualizowano statystyki");
	    }
	});

	//aktualizuje ogólną punktację
	io.sockets.in(socket.room).emit('punkty', redPoints[socket.room], bluePoints[socket.room]);
	//i punktację graczy
	io.sockets.in(socket.room).emit('joined left', blueTeam[socket.room], redTeam[socket.room], null);

	//Sprawdzam czy któraś drużyna wygrała
	if(redPoints[socket.room] === 20) {
		io.sockets.in(socket.room).emit('wygrana', "czerwona", redPoints[socket.room], bluePoints[socket.room], "red");
		restart(socket);
	} else if(bluePoints[socket.room] === 20) {
		io.sockets.in(socket.room).emit('wygrana', "niebieska", bluePoints[socket.room], redPoints[socket.room], "blue");
		restart(socket);
	}

};

var takePoints = function (socket){

	if(socket.team === "red"){
		redPoints[socket.room]--;
	} else {
		bluePoints[socket.room]--;
	}

	socket.points--;

	//aktualizuję punkty użytkownika w tablicy
	if(socket.team == "blue"){
		for(var i = 0; i < blueTeam[socket.room].length; i++){
			if(blueTeam[socket.room][i].name === socket.username){
				blueTeam[socket.room][i].points--;
			}
		}
	} else {
		for(var i = 0; i < redTeam[socket.room].length; i++){
			if(redTeam[socket.room][i].name === socket.username){
				redTeam[socket.room][i].points--;
			}
		}
	}

	//Zapisuję punkty użytkownikowi w bazie
	socket.allPunkty--;
	var statystyki = {"allPunkty":socket.allPunkty,"wygrane":socket.wygrane,"przegrane":socket.przegrane};
	var statystyki2 = JSON.stringify(statystyki);

	client.hmset(socket.username, "stats", statystyki2, function(err, reply2){
	   	if(err){
	   		console.log(err);
		} else {
	   		console.log("Zaktualizowano statystyki");
	    }
	});

	//aktualizuje ogólną punktację
	io.sockets.in(socket.room).emit('punkty', redPoints[socket.room], bluePoints[socket.room]);
	//i punktację graczy
	io.sockets.in(socket.room).emit('joined left', blueTeam[socket.room], redTeam[socket.room], null);

};

//Po skończonej grze, zerowanie punktów
var restart = function (socket){
	redPoints[socket.room] = 0;
	bluePoints[socket.room] = 0;

	io.sockets.in(socket.room).emit('punkty', redPoints[socket.room], bluePoints[socket.room]);
};

//Pobieram i wyświetlam statystyki użytkownika
var stats = function (socket){
	var nazwa = socket.username;
	client.hget(nazwa, "stats", function(err, reply){
		if (!reply){
			//pierwsze logowanie - przypisuję statystyki użytkownikowi
			var statystyki = {"allPunkty":"0","wygrane":"0","przegrane":"0"};
			var statystyki2 = JSON.stringify(statystyki);
			socket.allPunkty = 0;
			socket.wygrane = 0;
			socket.przegrane = 0;

			client.hmset(nazwa, "stats", statystyki2, function(err, reply2){
		    	if(err){
		    		console.log(err);
		    	} else {
		    		console.log("Przypisano statystyki nowemu graczowi");
		    	}
		    });

		    socket.emit('show stats', socket.username, socket.allPunkty, socket.wygrane, socket.przegrane);

		} else {
			var statystyki3 = JSON.parse(reply);
			socket.allPunkty = statystyki3.allPunkty;
			socket.wygrane = statystyki3.wygrane;
			socket.przegrane = statystyki3.przegrane;
			socket.emit('show stats', socket.username, socket.allPunkty, socket.wygrane, socket.przegrane);
		}

	});

};

var wygrana = function (socket){
	socket.wygrane++;
	var statystyki = {"allPunkty":socket.allPunkty,"wygrane":socket.wygrane,"przegrane":socket.przegrane};
	var statystyki2 = JSON.stringify(statystyki);

	client.hmset(socket.username, "stats", statystyki2, function(err, reply2){
	   	if(err){
	   		console.log(err);
		} else {
	   		console.log("Zaktualizowano statystyki");
	    }
	});
};

var przegrana = function (socket){
	socket.przegrane++;
	var statystyki = {"allPunkty":socket.allPunkty,"wygrane":socket.wygrane,"przegrane":socket.przegrane};
	var statystyki2 = JSON.stringify(statystyki);

	client.hmset(socket.username, "stats", statystyki2, function(err, reply2){
	   	if(err){
	   		console.log(err);
		} else {
	   		console.log("Zaktualizowano statystyki");
	    }
	});
};

var pustyPokoj = function (pokoj){
	if(io.sockets.clients(pokoj).length < 1 && pokoj > 1){
		for(var i = 2; i < rooms.length; i++){
			if(i == pokoj){
				temp1 = rooms.slice(0,i);
				temp2 = rooms.slice(i + 1,rooms.length);
				temp3 = temp1.concat(temp2);
				rooms = temp3;
			}
		}
		io.sockets.emit('showRooms', rooms, usersInRoom);
	}
};

io.sockets.on('connection', function (socket) {

	socket.username = socket.handshake.user.username;

	//Wyświetlanie istniejących pokoi po podłączeniu:
	socket.emit('showRooms', rooms, usersInRoom);
	stats(socket);
	
	
	socket.on('create room', function (data){
		usersInRoom.push(0);
		temp = rooms.push(data);	//temp przechowuje ilosc elementow w tablicy rooms
	
		//dane dla nowego pokoju
		redTeam[temp - 1] = [];
		blueTeam[temp - 1] = [];
		redPoints[temp - 1] = 0;
		bluePoints[temp - 1] = 0;

		//pokazuję wszystkim nowy pokój
		io.sockets.emit('showRooms', rooms, usersInRoom);

		//Dodaję gracza do nowego pokoju
		addPlayer(socket, temp - 1);
	});
	
	socket.on('join room', function (data){

		//Dodaję gracza do pokoju i drużyny
		addPlayer(socket, data);

	});

	socket.on('send msg', function (data) {
		data = socket.username + ': ' + data;
		console.log("SENT " + JSON.stringify(data));
		io.sockets.in(socket.room).emit('rec msg', data, socket.team);
	});
	
	socket.on('leave room', function (){
		tempRoom = socket.room;
		tempTeam = socket.team;
		socket.leave(tempRoom);
		socket.room = "";
		socket.team = "";

		//usuwam użytkownika z zespołu i pokoju:
		removePlayer(tempTeam, tempRoom, socket.username);

		//pokazuje aktualne statystyki
		stats(socket);

		//sprawdzam czy to była jedyna osoba w pokoju
		pustyPokoj(tempRoom);
		
	});

	//Sprawdzenie czy gracz udzielił dobrej odpowiedzi
	socket.on('check answer', function (data){

		console.log("correct: " + socket.correct + " / pressed: " + data);

		if(socket.correct === data){
			addPoints(socket);
			socket.emit('correct', socket.correct);
		} else {
			takePoints(socket);
			socket.emit('wrong', socket.correct, data);
		}

	});

	//Przejście do następnego pytania
	socket.on('next question', function (data){
		nextQuestion(socket);
	});

	//Koniec gry - uaktualnienie statystyk graczy i następna runda
	socket.on('next game', function (data){
		nextQuestion(socket);
		if(socket.team === data)
			wygrana(socket);
		else if(socket.team !== "" || socket.team !== undefined)
			przegrana(socket);
	});

	socket.on('wygrana', function (){
		wygrana(socket);
	});

	socket.on('przegrana', function (){
		przegrana(socket);
	});

	//Rozłączenie socketa - wyjście z gry i drużyny, jeśli był w pokoju
	socket.on('disconnect', function (){
		if(socket.room !== undefined && socket.room !== ""){
			tempRoom = socket.room;
			tempTeam = socket.team;
			socket.leave(tempRoom);
			socket.room = "";
			socket.team = "";

			//usuwam użytkownika z zespołu i pokoju:
			removePlayer(tempTeam, tempRoom, socket.username);

			//sprawdzam czy to była jedyna osoba w pokoju
			pustyPokoj(tempRoom);
		}
	});
	
	
});

module.exports = app;
