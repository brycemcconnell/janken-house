let player = null;
let current_enemy = null;

const socket = io();

socket.on('set_player', function(serverPlayer) {
    player = serverPlayer;
    console.log(player.name)
});

socket.on('admin_msg', function(msg) {
    const el = document.createElement('div');
    el.innerHTML = msg;
    document.body.appendChild(el);
});

[...document.querySelectorAll('.choice')].forEach(item => {
    item.onclick = function() {
        console.log('clicked ' + item.getAttribute('data-choice'))
        if (player.room) {
            socket.emit('choice', item.getAttribute('data-choice'));
        }
        [...document.querySelectorAll('.choice_img')].forEach(img => {
            img.classList.remove('choice_img-active');
        });
        document.querySelector('.'+item.getAttribute('data-choice')).classList.add('choice_img-active');
    }
});

socket.on('online_count', function(count) {
    document.getElementById('onlineCount').innerHTML = count;
});

socket.on('set_enemy', function(enemy) {
    current_enemy = enemy;
    player.enemy = current_enemy.socket_id;
    console.log(enemy);
    updatePlayers();
});

socket.on('room_list', function(rooms) {
    const roomListContainer = document.getElementById('room_list');
    roomListContainer.innerHTML = '';
    Object.entries(rooms).forEach(room => {
        const roomName = room[0];
        const roomData = room[1];
        const playerIsInRoom = Object.values(roomData.users).some(user_name => user_name == player.name);
        roomListContainer.innerHTML += addRoom(roomName, user_count(roomData.users), roomData.max_user_count, playerIsInRoom);
    });
});

document.getElementById('createRoom').onsubmit = function(e) {
    e.preventDefault();
    let roomNameVal = document.getElementById("roomName").value;
    socket.emit("create_room", `${roomNameVal}`);
    document.getElementById("roomName").value = '';
    return false;
}

function addRoom(room_name, user_count, max_user_count, current) {
    return `
    <tr>
        <td>
            ${room_name}
        </td>
        <td>
            (<span>${user_count}</span> / <span>${max_user_count}</span>) players
        </td>
        <td>
            <button data-room="${room_name}" onclick="${current ? 'leaveRoom(this)' : 'joinRoom(this)'}">${current ? 'Leave' : 'Join'}</button>
        </td>
        <td>
            <button data-room="${room_name}" onclick="deleteRoom(this)">Delete</button>
        </td>
    </tr>
    `;
}

document.getElementById('room_list').innerHTML += addRoom('test', 0, 2);

function joinRoom(el) {
    const room_name = el.getAttribute('data-room');
    socket.emit('join_room', room_name);
}

function leaveRoom(el) {
    const room_name = el.getAttribute('data-room');
    socket.emit('leave_room', room_name);
}

function deleteRoom(el) {
    const room_name = el.getAttribute('data-room');
    socket.emit('delete_room', room_name);
}


function user_count(users) {
    return Object.keys(users).length;
}

function generatePlayers(player1, player2) {
    const player1img = player1 ? "http://dflamingo.net/jgame/img/pico01.png" : "http://dflamingo.net/jgame/img/pico03.png";
    const player2img = player2 ? "http://dflamingo.net/jgame/img/pico02.png" : "http://dflamingo.net/jgame/img/pico03.png";
    if (player2 == null || player2 == {}) {
        player2 = {};
        player2.name = "Waiting for opponent";
        player2.status = '';
    }
    return `
    <div id="charenger01" class="person_box join">
        <figure><img src="${player1img}"></figure>
        <div class="data_box">
            <p class="name_line">${player1.name}</p>
            <p class="statas_line decision">${player1.status}</p>
        </div>
    </div>
    <div id="charenger02" class="person_box join">
        <figure><img src="${player2img}"></figure>
        <div class="data_box">
            <p class="name_line">${player2.name}</p>
            <p class="statas_line thinking">${player2.status}</p>
        </div>
    </div>
    `;
}

function updatePlayers() {
    document.getElementById('player_area').innerHTML = '';
    document.getElementById('player_area').innerHTML = generatePlayers(player, current_enemy);
}

socket.on('update_players', function(player1, player2) {
    player = player1;
    current_enemy = player2;
    updatePlayers();
});

socket.on('change_client_room', function(newRoom) {
    player.room = newRoom;
    if (newRoom == null) {
        document.getElementById('player_area').innerHTML = '';   
    }
});

socket.on('game_result', function(result) {
    switch (result) {
        case 'tie':
            console.log('tie');
        break;
        case 'win':
            console.log('You win');
            document.getElementById('win').classList.add('apear');
            setTimeout(function() {
                document.getElementById('win').classList.remove('apear');
            }, 1500);
        break;
        case 'lose':
            console.log('You lose!');
            document.getElementById('lose').classList.add('apear');
            setTimeout(function() {
                document.getElementById('lose').classList.remove('apear');
            }, 1500);
        break;
    }
    player.status = "THINKING";
    current_enemy.status = "THINKING";
    updatePlayers();
});
