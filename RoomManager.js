const User = require('./User.js').User;

const Room = require('./Room.js').Room;
const RoomType = require('./RoomType.js').RoomType;
const roomTypeList = require('./RoomType.js').roomTypeList;

/**
 * RULE: Room manager cannot mutate user data
 * RULE: Room manager cannot access io directly
 */
class RoomManager {

    constructor(rooms) {
        this.rooms = rooms;
    }

    /**
     * 
     * @param {string} name 
     * @returns {object} List of users as object
     */
    getUsersInRoom(name) {
        return this.rooms[name].users;
    }

    /**
     * Add a room to the room object.
     * @param {string} name 
     * @param {RoomType} type - the room type should one of the 'RoomTypes' keys 
     * @param {SocketIO.Socket|null} socket - Optionally, the user who created the room
     * @returns {Room} The new room object
     */
    add(name, type = roomTypeList.Janken, socket) {
        this.rooms[name] = new Room(name, type);
        if (socket) {
            console.log(`Room "${name}" was created by ${socket.id}`);
            socket.emit('admin_msg', `Created room ${name}`);
        }
        return this.rooms[name];
    }

    /**
     * 
     * @param {string} name 
     * @param {SocketIO.Socket|null} socket 
     * @returns {string} The name of the deleted room
     */
    delete(name, socket) {
        delete this.rooms[name];
        if (socket) {
            console.log(`Room "${name}" was deleted by ${socket.id}.`);
            socket.emit('admin_msg', `Deleted room ${name}`);
        }
        return name;
    }

    /**
     * Send all room data to the specified client/s
     * @param {SocketIO.Socket} client 
     */
    sendRoomDataToClient(client) {
        client.emit('room_list', this.rooms);
    }

    /**
     * Add reference of user to room
     * @param {User} user 
     * @param {string} roomName 
     * @returns {Room} The room that was joined
     */
    join(user, roomName) {
        this.rooms[roomName].users[user.socket_id] = user;
        return this.rooms[roomName];
    }

    /**
     * Remove user reference from one room
     * @param {SocketIO.Socket} socket 
     * @param {string} roomName - Name
     * @returns {Room|false} The room the user was kicked from
     */
    kick(socket, roomName) {
        if (this.rooms[roomName].users[socket.id] == null) {
            socket.emit('admin_msg', 'Cannot leave room, user not present');
            return false;
        }

        // Save the kicked user for a message
        const kickedUser = this.rooms[roomName].users[socket.id];

        // Remove the user from the room data
        delete this.rooms[roomName].users[socket.id];

        // Object.keys(rooms[room].users).forEach(user => {
        //     io.to(user).emit('update_players', users[user], null);
        // });
        
        return this.rooms[roomName];
    } 
    
    /**
     * Loop over all rooms and remove if user reference is present
     * @param {SocketIO.Socket} socket 
     */
    kickUserFromAllRooms(socket) {
        Object.keys(this.rooms).forEach(room => {
            this.kick(socket, room);
            
        });
    }

    kickGroupOfSocketsFromRoom(socketGroup, name) {
        Object.values(socketGroup).forEach(socket => {
            this.kick(socket, name);
        });
    }

    /**
     * Return a room by name
     * @param {string} room 
     * @returns {Room} The matching room
     */
    getRoom(room) {
        return this.rooms[room];
    }

    /**
     * Get current open slots in room (max - current)
     * @param {string} room 
     * @returns {number} The number of free slots in the room 
     */
    getOpenUserCount(room) {
        return this.rooms[room].max_user_count - Object.keys(this.rooms[room].users).length;
    }

    /**
     * Get a user if present in room
     * @param {SocketIO.Socket} socket 
     * @param {string} room 
     * @returns {User} The user if present in the room
     */
    userInRoom(socket, room) {
        return this.rooms[room].users[socket.id];
    }

    /**
     * Take the players in the room and update their game states
     * @param {string} roomName 
     * @returns {Room} The room affected
     */
    updateRoom(roomName) {
        Object.keys(this.rooms[roomName].users).forEach(user => {
            // Set enemy etc.
        });

        // Original code
        /*
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
        */
       return this.rooms[roomName];
    }
}

module.exports.RoomManager = RoomManager;