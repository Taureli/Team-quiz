var express = require('express');
var router = express.Router();

var passport = require('passport');

//-----REDIS------
var redis = require('redis'),
    client = redis.createClient();

client.on('error', function (err) {
    console.log('Error ' + err);
});
//----------------

var isAuthenticated = function(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
};

router.get('/login', function(req, res){
	res.render('login.ejs');
});

router.get('/', isAuthenticated, function(req, res){
	res.render('index.ejs');
	console.log(req.user.username);
});

router.post('/login',
    passport.authenticate('local', {
        failureRedirect: '/login'
    }),
    function (req, res) {
        res.redirect('/');
    }
);

//REJESTRACJA
router.post('/register', function (req, res){

	//czy hasła się zgadzają
	if(req.body.password === req.body.password2){

		login = req.body.username;
		password = req.body.password;

		//sprawdzam czy nie ma już takiej osoby w bazie
		client.hget(login, "password", function(err, reply){
			if (!reply){

				client.hmset(login, "password", password, function(err, reply){
			    	if(err){
			    		console.log(err);
			    	} else {
			    		console.log("Zarejestrowano użytkownika: " + login);
			    		//logowanie po rejestracji:
			    		passport.authenticate('local')(req, res, function(){
			    			return res.redirect('/');
			    		});
			    	}
			    });

			} else {
				res.redirect('/login');
			}

		});
	} else {
		res.redirect('/login');
	}

});

module.exports = router;
