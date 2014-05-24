var redis = require("redis"),
    client = redis.createClient();

/*
	PATTERN:
	{"question":,"a":,"b":,"c":,"d":,"correct":},
*/

var run = function () {
	var db = 
	{"questions":[
		{"question":"Odpowiedzią jest tak","a":"nie","b":"tak","c":"nie wiem","d":"może","correct":"b"},
		{"question":"Nie wiem jaka jest odpowiedź","a":"nie","b":"tak","c":"może","d":"nie wiem","correct":"d"}
	]};

	var db2 = JSON.stringify(db);

	client.set("questions", db2, function (err, reply){
		console.log(reply);
	});
	client.set("hello", "world", function (err, reply){
		console.log(reply);
	});

	client.quit();

}

client.on("error", function (err) {
    console.log("Error " + err);
});

client.on("connect", run);