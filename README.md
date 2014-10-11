#Team quiz

######Disclaimer: Whole application and all the questions are in Polish language

Web application written in JavaScript using mostly node.js and socket.io with Redis database.

After registering/logging in user can review his statistics, create a new room or join an existing one.
When joing a game player is automatically assigned to one of the two teams - red or blue.
Each player is given a random question. If he answers correctly he and his team gain a point, if the answer was wrong, one point is taken away.
Game ends after one of the teams gains 25 points.

##Features:
* Registering and logging in using Passport.io and secure protocol
* Keeping users informations (with statistics) and all the questions using Redis
* Players in the lobby can automatically see new gamerooms and current status of every room, without reloading a website
* All user-created rooms are automatically deleted if all players left
* Users can communicate with other players in current room using chat
* When one team wins, the game gets automatically restarted in that room
* Players statistics get updated in database everytime they leave a room

###How to run:

While in a folder with the project, type those commands into console:
* npm install
* bower install
* node app.js
