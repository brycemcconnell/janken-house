class Room {
    
    constructor(name, type) {
        this.name = name;
        this.users = {};
        this.type = type.name;
        this.max_user_count = type.max_user_count;
    }
}

module.exports.Room = Room;