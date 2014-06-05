$(function() {

    var socket = io.connect();

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
    var $a = $('#a');
    var $b = $('#b');
    var $c = $('#c');
    var $d = $('#d');
    var $bluePoints = $('#bluePoints');
    var $redPoints = $('#redPoints');
    var $myStats = $('#myStats');


    //--------ZAMIANA TAGÓW---------
    var tagsToReplace = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;'
    };

    var replaceTag = function(tag) {
        return tagsToReplace[tag] || tag;
    };

    var safe_tags_replace = function(str) {
        return str.replace(/[&<>]/g, replaceTag);
    };
    //--------------------------------

    //Na początku widoczny jest wybór pokoi
    $game.hide();

    //Przypisuje funkcje klik do buttonow:
    $makeRoom.click(function(e) {

        e.preventDefault(); //deaktywacja "defaultowego" dzialania buttona
        var newRoomName = prompt("Podaj nazwę nowego pokoju:");

        //nazwa pokoju nie może być pusta
        if (newRoomName !== null) {
            socket.emit('create room', newRoomName);
            $game.show();
            $rooms.hide();
            $chatLog.html('');
        }

    });

    //wyjście z pokoju
    $wyjdz.click(function(e) {

        e.preventDefault(); //deaktywacja "defaultowego" dzialania buttona

        socket.emit('leave room');
        $game.hide();
        $rooms.show();

    });

    //wysłanie wiadomości w czacie
    $send.click(function(e) {

        e.preventDefault(); //deaktywacja "defaultowego" dzialania buttona

        if ($message.val().length > 0) {
            console.log($message.val());
            socket.emit('send msg', safe_tags_replace($message.val()));
            $message.val(''); //czyszcze inputa
        }

    });

    //przyciski - odpowiedzi
    $a.click(function(e) {
        e.preventDefault();

        socket.emit('check answer', this.id);
    });

    $b.click(function(e) {
        e.preventDefault();

        socket.emit('check answer', this.id);
    });

    $c.click(function(e) {
        e.preventDefault();

        socket.emit('check answer', this.id);
    });

    $d.click(function(e) {
        e.preventDefault();

        socket.emit('check answer', this.id);
    });

    //Przyciski-pokoje są tworzone dynamicznie, dlatego metoda przypisania "klika" jest nieco inna:
    $(document).on('click', '#roomBtn', function(e) {

        e.preventDefault(); //deaktywacja "defaultowego" dzialania buttona

        socket.emit('join room', this.name);
        $game.show();
        $rooms.hide();
        $chatLog.html(''); //Czyszczę chat z wcześniejszych informacji

    });

    //Uruchomienie przycisków-odpowiedzi i przejście
    //do następnego pytania
    var nextQuestion = function(btn1, btn2) {
        //Przechodzę do następnego pytania
        socket.emit('next question');

        //aktywuję z powrotem przyciski
        $a.removeAttr("disabled");
        $b.removeAttr("disabled");
        $c.removeAttr("disabled");
        $d.removeAttr("disabled");

        //zmieniam kolory na domyślne
        $('#' + btn1).removeClass("btn-success");
        if (btn2 !== null)
            $('#' + btn2).removeClass("btn-danger");
    };

    //Wypisywanie wszystkich dostępnych pokoi
    socket.on('showRooms', function(data, usersInRoom) {
        $listRooms.html("");

        $.each(data, function(i, el) {
            $listRooms.append("<button type='button' class='btn btn-primary btn-lg mybtn' id='roomBtn' name='" + i + "'><b>" + el + "</b><p>Graczy: " + usersInRoom[i] + " </p></button>");
        });
    });

    //Wyświetla nazwę i statystyki zalogowanego usera
    socket.on('show stats', function(user, gry, wygrane, przegrane) {
        $('#Username').html("Zalogowano jako: " + user);
        $myStats.html("<b>Twoje statystyki:</b><br>");
        $myStats.append("Zebrane punkty: " + gry + "<br>");
        $myStats.append("Wygrane gry: " + wygrane + "<br>");
        $myStats.append("Przegrane gry: " + przegrane + "<br>");
    });

    //Aktualizacja chatu
    socket.on('rec msg', function(msg, team) {
        $chatLog.append("<div id=" + team + ">" + msg + '</div>');
        //Przewijanie na dół chatu:
        $chatLog.scrollTop($chatLog[0].scrollHeight);
    });

    //Aktualizuje listę graczy w pokoju, dodaje informacje w czacie
    //jeśli gracz dołączył lub wyszedł z gry
    socket.on('joined left', function(blueTeam, redTeam, info) {

        $blueTeam.html("");
        $redTeam.html("");

        $.each(blueTeam, function(i, el) {
            $blueTeam.prepend(el.name + ": " + el.points + '<br/>');
        });

        $.each(redTeam, function(i, el) {
            $redTeam.prepend(el.name + ": " + el.points + '<br/>');
        });

        if (info !== null)
            $chatLog.append(info + '<br/>');
    });

    //Wyświetlenie pytania i odpowiedzi
    socket.on('show question', function(question, ansa, ansb, ansc, ansd) {
        $question.html(question);
        $a.html(ansa);
        $b.html(ansb);
        $c.html(ansc);
        $d.html(ansd);
    });

    //Aktualizacja ogólnej punktacji
    socket.on('punkty', function(red, blue) {
        $redPoints.html(red);
        $bluePoints.html(blue);
    });

    //Jeśli któraś drużyna wygrała, wyświetlam alert z informacją
    socket.on('wygrana', function(team, mypoints, enemypoints, team2) {
        alert("Wygrała drużyna " + team + ", zdoywając " + mypoints + " punktów! \nDrużyna przeciwna uzyskała " + enemypoints + " punktów!");
        socket.emit('next game', team2);
    });

    //Jeśli gracz udzielił dobrej odpowiedzi, podświetl przycisk na zielono
    socket.on('correct', function(answer) {
        //wyłączam buttony, żeby nie można było 'nabijać' punktów na tym samym pytaniu
        $a.attr("disabled", "disabled");
        $b.attr("disabled", "disabled");
        $c.attr("disabled", "disabled");
        $d.attr("disabled", "disabled");

        //podświetlam przycisk na zielono
        $('#' + answer).addClass("btn-success");

        //po 1 sekundzie wywołuje funkcję
        setTimeout(function() {
            nextQuestion(answer, null);
        }, 1000);
    });

    //Jeśli gracz udzielił złej odpowiedzi, zaznaczam dobrą odpowiedź
    //na zielono, a odpowiedź gracza na czerwono
    socket.on('wrong', function(corr, answer) {
        //wyłączam buttony, żeby nie można było 'nabijać' punktów na tym samym pytaniu
        $a.attr("disabled", "disabled");
        $b.attr("disabled", "disabled");
        $c.attr("disabled", "disabled");
        $d.attr("disabled", "disabled");

        //podświetlam przycisk dobrej odpowiedzi na zielono
        $('#' + corr).addClass("btn-success");
        //i odpowiedź gracza na czerwono
        $('#' + answer).addClass("btn-danger");

        //po 1 sekundzie wywołuje funkcję
        setTimeout(function() {
            nextQuestion(corr, answer);
        }, 1000);
    });

});
