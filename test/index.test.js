const should = require('should');

const io = require('socket.io-client');

const socketURL = 'http://localhost:3000';
console.log('asd')
var options = {
    transports: ['websocket'],
    'force new connection': true
};

const client = io.connect(socketURL, options);

describe('Connecting player', function() {
    client.on('connect', function() {
        describe('setting player', function() {
            client.on('set_player', function(player) {
                describe('Valid Player?', () => {
                    it ('Player name is string', () => {
                        player.name.should.be.String();
                    });
                });
            });
        });
    });
});
