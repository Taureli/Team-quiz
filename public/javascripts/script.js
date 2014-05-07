$(function(){

	var socket = io.connect();
	
	//zmienne DOM:
	var $game = $('#game');
	var $rooms = $('#rooms');
	var $makeRoom = $('#makeRoom');
	var $listRooms = $('#listRooms');
	var $wyjdz = $('#wyjdz');
	var $blueTeam = $('#blueTeam');
	var $chatLog = $('#chatLog');


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
	
	//Przyciski-pokoje są tworzone dynamicznie, dlatego metoda przypisania "klika" jest nieco inna:
	$(document).on('click', '#roomBtn', function(e){
	
		e.preventDefault();	//deaktywacja "defaultowego" dzialania buttona
		
		socket.emit('join room', this.name);
		$game.show();
		$rooms.hide();
	
	});
	
	//Wypisywanie wszystkich dostępnych pokoi
	socket.on('showRooms', function(data){
		$listRooms.html("");
		
		$.each(data, function(i, el){
			$listRooms.append("<button type='button' class='btn btn-primary btn-lg mybtn' id='roomBtn' name='" + i + "'><b>" + el + "</b></button>");
		});
	});
	
	//Po dołączeniu do pokoju dodaje usera do listy i daje informację w czacie
	socket.on('joined', function (nazwa, info) {
		$blueTeam.append(nazwa + '<br/>');	//TYMCZASOWO
        $chatLog.append(info + '<br/>');
    });
	
	socket.on('left', function (info) {
        $chatLog.append(info + '<br/>');
    });
	
	
});