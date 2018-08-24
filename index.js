const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

const Room = require('./Room.js').Room;
const User = require('./User.js').User;
const AppManager = require('./AppManager.js').AppManager;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res){
	res.sendFile(__dirname + 'public/index.html');
});

const appManager = new AppManager(io).runIO();

http.listen(3000, function(){
	console.log('listening on *:3000');
});

function getWinnerLoser(player1, player2){
    let winner;
    let loser;
    if (player1.choice == 'rock') {
        if (player2.choice == 'paper') {
            winner = player2;
            loser = player1;
        } else if (player2.choice == 'rock') {
            return 'tie';
        } else { // player2.choice == 'scissors'
            winner = player1;
            loser = player2;
        }
    } else if (player1.choice == 'paper') {
        if (player2.choice == 'paper') {
            return 'tie';
        } else if (player2.choice == 'rock') {
            winner = player1;
            loser = player2;
        } else { // player2.choice == 'scissors'
            winner = player2;
            loser = player1;
        }
    } else { // player1.choice == scissors
        if (player2.choice == 'scissors') {
            return 'tie';
        } else if (player2.choice == 'paper') {
            winner = player1;
            loser = player2;
        } else { // player2.choice == rock
            winner = player2;
            loser = player1;
        }
    }

    return {
        winner: winner,
        loser: loser
    };
}

function sendSafeEnemy(user) {
    const safeUser = {
        name: user.name,
        status: user.status
    }
    return safeUser;
}
