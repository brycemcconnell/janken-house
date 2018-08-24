class RoomType {
    constructor() {

    }
}

const roomTypeList = {
    Janken: {
        name: "Janken",
        max_user_count: 2
    }
};

module.exports.RoomType = RoomType;
module.exports.roomTypeList = roomTypeList;