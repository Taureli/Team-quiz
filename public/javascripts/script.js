$(function(){

	var socket = io.connect();
	
	//zmienne DOM:
	var $game = $('#game');
	var $makeRoom = $('#makeRoom');
	var $listRooms = $('#listRooms');


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
	
	//Przyciski-pokoje są tworzone dynamicznie, dlatego metoda przypisania "klika" jest nieco inna:
	$(document).on('click', '#roomBtn', function(e){
	
		e.preventDefault();	//deaktywacja "defaultowego" dzialania buttona
		
		socket.emit('join room', this.name);
	
	});
	
	//Wypisywanie wszystkich dostępnych pokoi
	socket.on('showRooms', function(data){
		$listRooms.html("");
		
		$.each(data, function(i, el){
			$listRooms.append("<button type='button' class='btn btn-primary btn-lg mybtn' id='roomBtn' name='" + i + "'><b>" + el + "</b></button>");
		});
	});
	
	
});