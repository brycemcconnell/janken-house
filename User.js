const chance = require('chance').Chance();

class User {
    constructor(id) {
        this.name = chance.first();
        this.room = null;
        this.enemy = null;
        this.socket_id = id;
        this.status = "THINKING";
        this.choice = null;
    }
}

module.exports.User = User;