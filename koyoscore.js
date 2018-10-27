var http = require('http');
var socketio = require('socket.io');
var fs = require('fs');

var score_a = 0;
var score_b = 0;
var scores_a = [0];
var scores_b = [0];
const scores_len_max = 100;

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

    socket.on('team_all', function (data) {
        switch (data.value) {
            case "init":
                break;
            case "back":
                if (scores_a.length > 3) {
                    score_a = scores_a[scores_a.length - 2];
                    scores_a.pop();
                }
                if (scores_b.length > 3) {
                    score_b = scores_b[scores_b.length - 2];
                    scores_b.pop();
                }
                break;
            case "reset":
                score_a = 0;
                scores_a.push(score_a);
                score_b = 0;
                scores_b.push(score_b);
                break;
            default:
        }
        if (scores_a.length > scores_len_max) scores_a.shift();
        if (scores_b.length > scores_len_max) scores_b.shift();

        io.to(room).emit('score', { score_a: score_a, score_b: score_b });

        // debug
        console.log("score A: " + score_a + " B: " + score_b + "  input: " + data.value);
    });

    socket.on('team_a', function (data) {
        score_a += data.value;
        scores_a.push(score_a);
        scores_b.push(score_b);
        if (scores_a.length > scores_len_max) scores_a.shift();
        if (scores_b.length > scores_len_max) scores_b.shift();

        io.to(room).emit('score', { score_a: score_a, score_b: score_b });

        // debug
        console.log("score A: " + score_a + " B: " + score_b + "  input: " + data.value);
    });

    socket.on('team_b', function (data) {
        score_b += data.value;
        scores_b.push(score_b);
        scores_a.push(score_a);
        if (scores_a.length > scores_len_max) scores_a.shift();
        if (scores_b.length > scores_len_max) scores_b.shift();

        io.to(room).emit('score', { score_a: score_a, score_b: score_b });

        // debug
        console.log("score A: " + score_a + " B: " + score_b + "  input: " + data.value);
    });
});