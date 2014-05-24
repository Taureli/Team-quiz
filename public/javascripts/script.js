$(function(){

	var socket = io.connect();
	
	//zmienne DOM:
	var $game = $('#game');
	var $rooms = $('#rooms');
	var $makeRoom = $('#makeRoom');
	var $listRooms = $('#listRooms');
	var $wyjdz = $('#wyjdz');
	var $blueTeam = $('#blueTeam');
	var $redTeam = $('#redTeam');
	var $chatLog = $('#chatLog');
	var $send = $('#send');
	var $message = $('#message');
	var $question = $('#question');
	var $ansa = $('#ansa');
	var $ansb = $('#ansb');
	var $ansc = $('#ansc');
	var $ansd = $('#ansd');


	//--------ZAMIANA TAGÓW---------
    var tagsToReplace = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;'
    };
		
    var replaceTag = function (tag) {
        return tagsToReplace[tag] || tag;
    };
		
    var safe_tags_replace = function (str) {
        return str.replace(/[&<>]/g, replaceTag);
    };
	//--------------------------------
	
	$game.hide();
	
	//Przypisuje funkcje klik do buttonow:
	$makeRoom.click(function(e){
	
		e.preventDefault();	//deaktywacja "defaultowego" dzialania buttona
		var newRoomName = prompt("Podaj nazwę nowego pokoju:");
		
		if(newRoomName != null){
			socket.emit('create room', newRoomName);
		}
	
	});
	
	$wyjdz.click(function(e){
	
		e.preventDefault();	//deaktywacja "defaultowego" dzialania buttona
		
		socket.emit('leave room');
		$game.hide();
		$rooms.show();
	
	});

	$send.click(function(e){
	
		e.preventDefault();	//deaktywacja "defaultowego" dzialania buttona
		
		if($message.val().length > 0){
			console.log($message.val());
			socket.emit('send msg', safe_tags_replace($message.val()));
			$message.val('');	//czyszcze inputa
		}
	
	});

	$ansa.click(function(e){
		e.preventDefault();
	});

	$ansb.click(function(e){
		e.preventDefault();
	});

	$ansc.click(function(e){
		e.preventDefault();
	});

	$ansd.click(function(e){
		e.preventDefault();
	});
	
	//Przyciski-pokoje są tworzone dynamicznie, dlatego metoda przypisania "klika" jest nieco inna:
	$(document).on('click', '#roomBtn', function(e){
	
		e.preventDefault();	//deaktywacja "defaultowego" dzialania buttona
		
		socket.emit('join room', this.name);
		$game.show();
		$rooms.hide();
		$chatLog.html('');	//Czyszczę chat z wcześniejszych informacji
	
	});
	
	//Wypisywanie wszystkich dostępnych pokoi
	socket.on('showRooms', function(data){
		$listRooms.html("");
		
		$.each(data, function(i, el){
			$listRooms.append("<button type='button' class='btn btn-primary btn-lg mybtn' id='roomBtn' name='" + i + "'><b>" + el + "</b></button>");
		});
	});

	//Ustawianie nazwy użytkownika
	socket.on('choose name', function(data){
		var name = prompt("Podaj swoją nazwę:");

		socket.emit('check name', name);
	});

	//Aktualizacja chatu
	socket.on('rec msg', function (data) {
        $chatLog.append(data + '<br/>');
    });
	
	//Po dołączeniu lub wyjściu z pokoju wypisuje userów do listy i daje informację w czacie
	socket.on('joined left', function (blueTeam, redTeam, info) {
	
		$blueTeam.html("");
		$redTeam.html("");
	
		$.each(blueTeam, function(i, el){
			$blueTeam.prepend(el + '<br/>');
		});
		
		$.each(redTeam, function(i, el){
			$redTeam.prepend(el + '<br/>');
		});
		
        $chatLog.append(info + '<br/>');
    });

    socket.on('show question', function (question, ansa, ansb, ansc, ansd){
    	$question.html(question);
    	$ansa.html(ansa);
    	$ansb.html(ansb);
    	$ansc.html(ansc);
    	$ansd.html(ansd);
    });
	
	
});