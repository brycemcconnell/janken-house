class Room {
    constructor(name, max_user_count) {
        this.name = name;
        this.users = {};
        this.max_user_count = max_user_count;
       
    }
}

module.exports.Room = Room;