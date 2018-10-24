var http = require('http');
var socketio = require('socket.io');
var fs = require('fs');

var score = 0;
var scores = [0];

var server = http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fs.readFileSync(__dirname + '/index.html', 'utf-8'));
}).listen(3000);

var io = socketio.listen(server);

io.sockets.on('connection', function (socket) {
    var room = '';
    var name = '';

    socket.on('client_to_server_join', function (data) {
        console.log("new join @ " + data.value);
        room = data.value;
        socket.join(room);
    });

    socket.on('client_to_server', function (data) {
        if (data.value != "init") {
            if (data.value == "reset") {
                score = 0;
                scores.push(score);
            } else if (data.value == "back") {
                if (scores.length > 3) {
                    score = scores[scores.length - 2];
                    scores.pop();
                }
            } else {
                score += data.value;
                scores.push(score);
            }
            if (scores.length > 100) scores.shift();
        }

        io.to(room).emit('server_to_client', { value: score });

        // debug
        console.log("score: " + score + "  input:" + data.value);
    });
});