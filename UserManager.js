const User = require('./User.js').User;

class UserManager {

    constructor() {
        this.users = {};
    }

    /**
     * 
     * @param {SocketIO.Socket} socket 
     * @returns {User} The created user object
     */
    add(socket) {
        // Add user.
        this.users[socket.id] = new User(socket.id);

        // Send the user their data
        socket.emit('set_player', this.users[socket.id]);

        // Send a welcome message to the user
        socket.emit('admin_msg', `Hello, your random name is ${this.users[socket.id].name}`);

        // Notify everyone else that the user has connected (name)
        socket.broadcast.emit('admin_msg', `${this.users[socket.id].name} has connected.`);

        // Notify the server that the user connected
        console.log(`${socket.id} (${this.users[socket.id].name}) has connected`);

        return this.users[socket.id];
    }

    /**
     * 
     * @param {SocketIO.Socket} socket 
     * @returns {User} The deleted user object
     */
    remove(socket) {
        // Notify everyone else that the user has disconnected (name)
        socket.broadcast.emit('admin_msg', `${this.users[socket.id].name} has disconnected.`);

        // Notify the server that the user disconnected
        console.log(`${socket.id} (${this.users[socket.id].name}) has disconnected`);

        // Save the user to return
        const user = this.users[socket.id];

        // Delete user from the manager
        delete this.users[socket.id];

        // Return the deleted user
        return user;
    }

    /**
     * 
     * @param {SocketIO.Socket} client 
     */
    updateClientOnlineCount(client) {
        client.emit('online_count', Object.keys(this.users).length);
    }

    /**
     * 
     * @param {SocketIO.Socket} socket
     * @returns {string} roomName - Name of the room
     */
    getUserRoom(socket) {
        return this.users[socket.id].room;
    }

    /**
     * 
     * @param {SocketIO.Socket} socket 
     * @returns {User} The user object or null
     */
    getUser(socket) {
        return this.users[socket.id];
    }

    /**
     * 
     * @param {SocketIO.Socket} socket 
     * @param {string} roomName 
     * @returns {User} The user that joined the room
     */
    setUserRoom(socket, roomName) {
        // Set the user's room to the new room
        this.users[socket.id].room = roomName;

        // Send message to room people
        socket.to(roomName).emit("admin_msg", `${this.users[socket.id].name} joined ${roomName}`);

        // Set the socket to the new room
        socket.join(roomName);

        // Send a confirmation to the client
        socket.emit('admin_msg', `Joined room ${roomName}.`);

        // Update the client's room view
        socket.emit('change_client_room', roomName);
        
        return this.users[socket.id];
    }

    /**
     * 
     * @param {SocketIO.Socket} socket 
     * @param {string} roomName 
     * @returns {User} The user that left the room
     */
    unsetUserRoom(socket, roomName) {
        // Unset the user's room
        this.users[socket.id].room = null;

        // Unset the socket room
        socket.leave(roomName);

        // Notify members of room of user leaving
        socket.to(roomName).emit("admin_msg", `${this.users[socket.id].name} left ${roomName}`);

        // Notify user that they left the room
        socket.emit('admin_msg', `You left the room ${roomName}`);

        // Update the client's room view
        socket.emit('change_client_room', roomName);
        
        return this.users[socket.id];
    }
}

module.exports.UserManager = UserManager;