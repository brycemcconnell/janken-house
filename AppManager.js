const Room = require('./Room.js').Room;

const UserManager = require('./UserManager.js').UserManager;
const RoomManager = require('./RoomManager.js').RoomManager;

/**
 * State of the server is stored inside here,
 * Managers are responsible for only their respective parts
 * Managers shouldn't touch sockets/io
 */
class AppManager {

    constructor(io) {
        this.io = io;
        this.users = {};
        this.rooms = {};


        this.userManager = new UserManager(this.users);
        this.roomManager = new RoomManager(this.rooms);
    }

    runIO() {
        this.io.on('connection', (socket) => {

            this.addUser(socket);

            socket.on('disconnect', () => {
                this.removeUser(socket);
            });
            
            socket.on('create_room', (roomName) => {
                this.addRoom(socket, roomName);
            });

            socket.on('join_room', (roomName) => {
                this.joinRoom(socket, roomName);
            });

            socket.on('leave_room', (roomName) => {
                this.leaveRoom(socket, roomName);
            });

            socket.on('delete_room', (roomName) => {
                this.deleteRoom(socket, roomName);
            });


            socket.on('choice', (msg) => { // @TODO
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
        });
    }

    /** 
     * Add a user to the user manager and notify users of change
     * @param {SocketIO.Socket} socket - The socket object of the user
    */
    addUser(socket) {
        // Check if user already exists.
        if (this.userManager.getUser(socket)) {
            return false;
        }

        // Add to list of users
        const user = this.userManager.add(socket);

        // Send the list of rooms to the new user
        this.roomManager.sendRoomDataToClient(socket);

        // Update the online count for all users
        this.userManager.updateClientOnlineCount(this.io);

        return user;
    }

    /**
     * Remove user from the user manager, kick from all rooms and notify users
     * @param {SocketIO.Socket} socket - The socket object of the user
    */
    removeUser(socket) {
        // Check if user doesn't exist.
        if (this.userManager.getUser(socket) == null) {
            return false;
        }

        // Delete user from users
        const user = this.userManager.remove(socket);

        // Update the online count for all users
        this.userManager.updateClientOnlineCount(this.io);

        // Remove user from all rooms
        this.roomManager.kickUserFromAllRooms(socket);
        
        // Send the list of rooms to the each user
        this.roomManager.sendRoomDataToClient(this.io);

        return user;
    }

    /**
     * Ask app manager to create a room
     * @param {SocketIO.Socket} socket 
     * @param {string} roomName 
     * @returns {Room|false} The room that was created
     */
    addRoom(socket, roomName, type = undefined) {
        // Check if user already in a room
        const userCurrentRoom = this.userManager.getUserRoom(socket);
        if (userCurrentRoom) {
            socket.emit('admin_msg', `You can only join one room, leave ${userCurrentRoom} to create ${roomName}.`);
            return false;
        }

        // Check if room already exists
        if (this.roomManager.getRoom(roomName)) {
            socket.emit('admin_msg', `Sorry the room ${roomName} already exists, try a different name.`);
            return false;
        }

        // Create room
        const room = this.roomManager.add(roomName, type, socket);

        // Add the user to the room data
        this.roomManager.join(this.userManager.getUser(socket), roomName);

        // Set the user's current room in the user manager and socket data
        this.userManager.setUserRoom(socket, roomName);

        // Update the room list of everyone
        this.roomManager.sendRoomDataToClient(this.io);

        // Update everyone inside the room
        this.roomManager.updateRoom(roomName);

        // socket.emit('change_client_room', roomName);
        // socket.emit('update_players', users[socket.id], null);
        
        // Send the list of rooms to the each user
        this.roomManager.sendRoomDataToClient(this.io);

        return room;
    }

    /**
     * 
     * @param {SocketIO.Socket} socket 
     * @param {string} roomName 
     * @returns {Room|false} The room that was joined
     */
    joinRoom(socket, roomName) {
        // Check if the room exists
        if (this.roomManager.getRoom(roomName) == null) {
            socket.emit('admin_msg', `Sorry the room ${roomName} doesn't exist, try a different name.`);
            return false;
        }

        // Check if there are open slots in the room
        if (this.roomManager.getOpenUserCount(roomName) <= 0) {
            socket.emit('admin_msg', `The room ${roomName} is already full.`);
            return false;
        }

        // Check if the user isn't already in another room
        if (this.roomManager.userInRoom(socket, roomName)) {
            socket.emit('admin_msg', `You are in ${roomName}, leave this room to join another.`);
            return false;
        }

        // Add the user to the room data
        const room = this.roomManager.join(this.userManager.getUser(socket), roomName);

        // Set the user's current room in the user manager and socket data
        this.userManager.setUserRoom(socket, roomName);

        // Update the room list of everyone
        this.roomManager.sendRoomDataToClient(this.io);

        // Update everyone inside the room
        this.roomManager.updateRoom(roomName);
        
        return room;
    }

    /**
     * 
     * @param {SocketIO.Socket} socket 
     * @param {string} roomName 
     * @returns {Room|false} The room that was left
     */
    leaveRoom(socket, roomName) {
        // if there is no room found
        if (this.roomManager.getRoom(roomName) == null) {
            socket.emit('admin_msg', `You cannot leave ${roomName} because it doesn't exist.`);
            return false;
        }

        // If the user isn't even in the room
        if (this.roomManager.userInRoom(socket, roomName) == null) {
            socket.emit('admin_msg', `You can't leave ${roomName} because you are not in the room.`);
            return false;
        }

        // Remove the room from the user
        this.userManager.unsetUserRoom(socket, roomName);

        // Remove user from the room
        const room = this.roomManager.kick(socket, roomName);

        // Update room list for all users
        this.roomManager.sendRoomDataToClient(this.io);

        // Update everyone inside the room
        this.roomManager.updateRoom(roomName);

        return room;
    }

    /**
     * 
     * @param {SocketIO.Socket} socket 
     * @param {string} roomName 
     * @returns {Room|false} A copy of the room that was deleted
     */
    deleteRoom(socket, roomName) {

        const room = this.roomManager.getRoom(roomName);
         // if there is no room found
         if (room == null) {
            socket.emit('admin_msg', `You cannot delete ${roomName} because it doesn't exist.`);
            return false;
        }

        // Get a list of users in the room
        const roomUsers = this.roomManager.getUsersInRoom(roomName);

        const roomUserSockets = this.getGroupOfSockets(roomUsers);

        // Kick all the users from that room
        this.roomManager.kickGroupOfSocketsFromRoom(roomUserSockets, roomName);

        // Set all user rooms back to null
        this.userManager.unsetGroupOfSocketsFromRoom(roomUserSockets, roomName);

        // Delete the room from the room manager
        this.roomManager.delete(roomName, socket);

        // Update room list for all users
        this.roomManager.sendRoomDataToClient(this.io);

        return room;
    }

    getSocket() {

    }

    getGroupOfSockets(group) {
        const socketGroup = Object.values(group).map(user => {
            return this.io.sockets.connected[user.socket_id];
        });
        return socketGroup;       
    }
}

module.exports.AppManager = AppManager;


