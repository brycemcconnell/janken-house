const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

const Room = require('./Room.js').Room;
const User = require('./User.js').User;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res){
	res.sendFile(__dirname + 'public/index.html');
});

const users = {};

const rooms = {};

function updateRoomList(who) {
    who.emit('room_list', rooms);
}

function updateOnlineCount() {
	io.emit('online_count', Object.keys(users).length);
}

io.on('connection', function(socket) {
    /* 
    Welcome start
    *********************************************/
    users[socket.id] = new User(socket.id);
    socket.emit('set_player', users[socket.id]);
    updateRoomList(socket);
    updateOnlineCount();
    socket.emit('admin_msg', 'Hello, your random name is ' + users[socket.id].name);
    socket.broadcast.emit('admin_msg', users[socket.id].name + ' has connected.')
    console.log(socket.id + ' connected');

    /*********************************************
    Welcome end
    */
    /* 
    Disconnect start
    *********************************************/
    socket.on('disconnect', function(){
        io.emit('admin_msg', users[socket.id].name + ' has disconnected.');
        console.log(socket.id + ' disconnected');
        Object.keys(rooms).forEach(room => {
            if (rooms[room].users[socket.id]) {
                delete rooms[room].users[socket.id];
                Object.keys(rooms[room].users).forEach(user => {
                    io.to(user).emit('update_players', users[user], null);
                });
            }
        });
        delete users[socket.id];
        updateRoomList(io);
        updateOnlineCount();
    });
    /*********************************************
    Disconnect end
    */
    /* 
    Game start
    *********************************************/
    socket.on('choice', function(msg) {
        socket.emit('admin_msg', 'You chose ' + msg);
        // socket.broadcast.emit('admin_msg', users[socket.id].name + ' chose ' + msg);
        users[socket.id].status = "WAITING";
        users[socket.id].choice = msg;

        const player = users[socket.id];
        const enemy = users[users[socket.id].enemy];

        socket.emit('update_players', player, enemy);
        io.to(`${users[socket.id].enemy}`).emit('update_players', enemy, player);

        console.log(socket.id + ' chose ' + msg);

        if (player.status == "WAITING" && enemy.status == "WAITING") {
            const result = getWinnerLoser(player, enemy); 
            player.status = "THINKING";
            enemy.status = "THINKING";
            if (result == 'tie') {
                io.to(player.socket_id).emit('game_result', 'tie');
                io.to(enemy.socket_id).emit('game_result', 'tie');
                return;
            }
            // Was not a tie
            io.to(result.winner.socket_id).emit('game_result', 'win');
            io.to(result.loser.socket_id).emit('game_result', 'lose');
            return;
        }
    });
    /*********************************************
    Game end
    */
    /* 
    Room start
    *********************************************/
    socket.on('create_room', function(roomName) {
        if (rooms[roomName]) {
            socket.emit('admin_msg', `Sorry the room ${roomName} already exists, try a different name.`);
            return;
        }
        if ( users[socket.id].room ) {
            socket.emit('admin_msg', `You can only join one room, leave ${users[socket.id].room} to create ${roomName}.`);
            return;
        }
        rooms[roomName] = new Room(roomName, 2);
        users[socket.id].room = roomName;
        rooms[roomName].users[socket.id] = users[socket.id].name;
        socket.join(roomName);
        socket.emit('admin_msg', `Joined room ${roomName}.`);
        socket.emit('change_client_room', roomName);
        socket.emit('update_players', users[socket.id], null);
        updateRoomList(io);
        console.log(`Room "${roomName}" was created by ${socket.id}.`);
    });

    socket.on('join_room', function(roomName) {
        if (rooms[roomName]) {
            if ( Object.keys(rooms[roomName].users).length > rooms[roomName].max_user_count ) {
                socket.emit('admin_msg', `The room ${roomName} is already full.`);
                return;
            }
            if ( rooms[roomName].users[socket.id] ) {
                socket.emit('admin_msg', `You have already joined ${roomName}.`);
                return;
            }
            if ( users[socket.id].room ) {
                socket.emit('admin_msg', `You can only join one room, leave ${users[socket.id].room} to join ${roomName}.`);
                return;
            }
            users[socket.id].room = roomName;
            rooms[roomName].users[socket.id] = users[socket.id].name;
            socket.join(roomName);
            socket.emit('admin_msg', `Joined room ${roomName}.`);
            socket.emit('change_client_room', roomName);
            updateRoomList(io);

            users[socket.id].enemy = Object.keys(rooms[roomName].users).find(item => users[item].name != users[socket.id].name);
            console.log(users[socket.id].enemy)
            if (users[socket.id].enemy) {
                io.to(users[socket.id].enemy).emit('set_enemy', sendSafeEnemy(users[socket.id]));
                users[users[socket.id].enemy].enemy = socket.id;
                socket.emit('set_enemy', sendSafeEnemy(users[users[socket.id].enemy]));
            }
            const enemy = users[users[socket.id].enemy] ? users[users[socket.id].enemy] : null;
            const player = users[socket.id];
            socket.emit('update_players', player, enemy );
            console.log(enemy);
            if (enemy) {
                io.to(users[socket.id].enemy).emit('update_players', enemy, player);
            }
            return;
        }
        socket.emit('admin_msg', `Sorry the room ${roomName} doesn't exist, try a different name.`);
    });

    socket.on('leave_room', function(roomName) {
        if (rooms[roomName]) {
            if ( rooms[roomName].users[socket.id] ) {
                users[socket.id].room = null;
                socket.leave(roomName);
                socket.emit('admin_msg', `You left ${roomName}.`);
                socket.emit('change_client_room', null);
                delete rooms[roomName].users[socket.id];
                Object.keys(rooms[roomName].users).forEach(user => {
                    users[user].enemy = null;
                    io.to(user).emit('update_players', users[user], null)
                });
                updateRoomList(io);
                return;
            }
            socket.emit('admin_msg', `You can't leave ${roomName} because you are not in the room.`);
            return;
        }
        socket.emit('admin_msg', `Sorry the room ${roomName} doesn't exist, try a different name.`);
    });

    socket.on('delete_room', function(roomName) {
        if (rooms[roomName]) {
            Object.keys(rooms[roomName].users).forEach(user => {
                users[user].room = null;
                io.sockets.connected[user].leave(roomName);
                io.to(user).emit('change_client_room', null);
            });
            socket.emit('change_client_room', null);
            delete rooms[roomName];
            socket.emit('admin_msg', `Deleted room ${roomName}.`);
            updateRoomList(io);
            console.log(`Room ${roomName} was deleted by ${socket.id}`);
            return;
        }
        socket.emit('admin_msg', `Sorry the room ${roomName} doesn't exist, try a different name.`);
    });
    /*********************************************
    Room end
    */
});

http.listen(3000, function(){
	console.log('listening on *:3000');
});

function getWinnerLoser(player1, player2){
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