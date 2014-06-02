var redis = require("redis"),
    client = redis.createClient(17789,"pub-redis-17789.us-east-1-2.1.ec2.garantiadata.com");

    client.auth("superquiz");

/*
	PATTERN:
	{"question":,"a":,"b":,"c":,"d":,"correct":},
*/

var run = function () {
	var db = 
	{"questions":[
		{"question":"Jaka część mowy odpowiada na pytania: kto, co?","a":"przymiotnik","b":"czasownik","c":"rzeczownik","d":"przysłówek","correct":"c"},
		{"question":"Co nie jest nazwą stylu pływackiego?","a":"rekin","b":"kraul","c":"żabka","d":"delfin","correct":"a"},
		{"question":"Ile jest znaków zodiaku?","a":"12","b":"15","c":"16","d":"10","correct":"a"},
		{"question":"Do ilu punktów liczy się set w tenisie stołowym?","a":"25","b":"21","c":"16","d":"10","correct":"b"},
		{"question":"Jakie są najwyższe góry na świecie?","a":"Tatry","b":"Himalaje","c":"Pireneje","d":"Alpy","correct":"b"},
		{"question":"Gdzie leży Arktyka?","a":"wokół bieguna południowego","b":"na równiku","c":"na Księżycu","d":"wokół bieguna północnego","correct":"d"},
		{"question":"Która z tych postaci nie wystąpiła w trylogii J.R.R. Tolkiena?","a":"farmer Maggot","b":"Thorin Dębowa Tarcza","c":"Galadriela","d":"wszystkie wystąpiły","correct":"b"},
		{"question":"Co łączy kości?","a":"sadzawka","b":"bajoro","c":"staw","d":"jezioro","correct":"c"},
		{"question":"Jaka bywa ulica?","a":"kulawa","b":"głucha","c":"ślepa","d":"rozmowna","correct":"c"},
		{"question":"Winston Churchill był laureatem nagrody nobla w jakiej dziedzinie?","a":"literatury","b":"ekonomii","c":"nauk politycznych","d":"była to nagroda pokojowa","correct":"a"},
		{"question":"Z którego roku pochodzi konstytucja Stanów Zjednoczonych?","a":"1803","b":"1795","c":"1791","d":"1787","correct":"d"},
		{"question":"Temat lub rzecz, o której z jakiegoś powodu nie można mówić?","a":"grzech","b":"sakrum","c":"profanum","d":"tabu","correct":"d"},
		{"question":"Co odmierzamy w ryzach?","a":"drewno","b":"papier","c":"węgiel","d":"siarkę","correct":"b"},
		{"question":"Jak nazywa się powtórzenie występu artysty na życzenie widowni?","a":"primo","b":"duo","c":"bis","d":"dwójka","correct":"c"},
		{"question":"Ile jest województw w Polsce?","a":"49","b":"13","c":"18","d":"16","correct":"d"},
		{"question":"Jak nazywa się osoba podpowiadająca aktorom w teatrze?","a":"suflet","b":"sufler","c":"podpowiadacz","d":"szeptacz","correct":"b"},
		{"question":"Jakiego koloru jest czarna skrzynka w samolocie?","a":"czarna","b":"czerwona","c":"pomarańczowa","d":"Zielona","correct":"c"},
		{"question":"W którym roku wynaleziono telefon?","a":"1876","b":"1887","c":"1934","d":"1867","correct":"a"},
		{"question":"Które miasto jest stolicą Austalii?","a":"Canaberra","b":"Sydney","c":"Melbourne","d":"Townsville","correct":"a"},
		{"question":"Gdzie znajduje się Hollywood?","a":"Atlanta","b":"Las Vegas","c":"San Francisco","d":"Los Angeles","correct":"d"},
		{"question":"W którym ze swoich filmów nie zagrał Quentin Tarantino?","a":"Pulp Fiction","b":"Kill Bill I","c":"Cztery pokoje","d":"Wściekłe psy","correct":"b"},
		{"question":"Do ilu mórz dostęp ma Izrael?","a":"dwóch","b":"jednego","c":"trzech","d":"żadnego","correct":"a"},
		{"question":"Jaka jest główna różnica między Coca-Colą sprzedawaną w USA, a tą w UE?","a":"woda","b":"kofeina","c":"cukier","d":"poziom CO2","correct":"c"},
		{"question":"Ile kości ma dorosły człowiek?","a":"104","b":"206","c":"26","d":"52","correct":"b"},
		{"question":"Jakie katastrofy naturalne występują na Księżycu?","a":"wybuchy wulkanów","b":"burze pyłowe","c":"powodzie","d":"trzęsienia ziemi","correct":"c"},
		{"question":"W jakim statku powietrznym odbył się pierwszy nieprzerwany lot dookola świata?","a":"dwupłatowcu","b":"balonie na rozgrzane powietrze","c":"szybowcu","d":"samolocie odrzutowym","correct":"b"},
		{"question":"Co jest największe z podanych?","a":"mila morska","b":"mila lądowa w USA","c":"wiorsta","d":"kilometr","correct":"a"},
		{"question":"W którym Europejskim mieście znajduje się najwięcej drapaczy chmur?","a":"w Londynie","b":"we Frankfurcie","c":"w Moskiwe","d":"w Madrycie","correct":"c"},
		{"question":"Gdzie wybudowano pierwszą w historii linię metra?","a":"w Nowym Jorku","b":"w Londynie","c":"w Paryżu","d":"w Moskwie","correct":"b"},
		{"question":"Skąd pochodzi rożek angielski?","a":"z Londynu","b":"z Exeter","c":"z Paryża","d":"z Wrocławia","correct":"d"},
		{"question":"Kto nosi pierścień rybaka?","a":"Królowa Anglii","b":"Papież","c":"Wielki Mag Ku Klux Klanu","d":"Sułtan Brunei","correct":"b"}
	]};

	var db2 = JSON.stringify(db);

	client.set("questions", db2, function (err, reply){
		console.log(reply);
	});

	client.quit();

}

client.on("error", function (err) {
    console.log("Error " + err);
});

client.on("connect", run);