const http = require('http');
const socketio = require('socket.io');
const fs = require('fs');
const path = require('path');

var score_a = 0;
var score_b = 0;
var scores_a = [0];
var scores_b = [0];
const scores_len_max = 100;

const server = http.createServer(requestListener);
server.listen((process.env.PORT || 3000), () => {
    console.log("Server opened @ port: " + (process.env.PORT || 3000));
});

function requestListener(request, response) {
    const requestURL = request.url;
    const extensionName = path.extname(requestURL);
    switch (extensionName) {
        case '.html':
            readFileHandler(requestURL, 'text/html', false, response);
            break;
        case '.css':
            readFileHandler(requestURL, 'text/css', false, response);
            break;
        case '.js':
        case '.ts':
            readFileHandler(requestURL, 'text/javascript', false, response);
            break;
        case '.png':
            readFileHandler(requestURL, 'image/png', true, response);
            break;
        case '.jpg':
            readFileHandler(requestURL, 'image/jpeg', true, response);
            break;
        case '.gif':
            readFileHandler(requestURL, 'image/gif', true, response);
            break;
        default:
            readFileHandler('/index.html', 'text/html', false, response);
            break;
    }
}

function readFileHandler(fileName, contentType, isBinary, response) {
    const encoding = !isBinary ? 'utf8' : 'binary';
    const filePath = __dirname + fileName;

    fs.exists(filePath, function (exits) {
        if (exits) {
            fs.readFile(filePath, { encoding: encoding }, function (error, data) {
                if (error) {
                    response.statusCode = 500;
                    response.end('Internal Server Error');
                } else {
                    response.statusCode = 200;
                    response.setHeader('Content-Type', contentType);
                    if (!isBinary) {
                        response.end(data);
                    }
                    else {
                        response.end(data, 'binary');
                    }
                }
            });
        }
        else {
            response.statusCode = 400;
            response.end('400 Error');
        }
    });
}

const io = socketio.listen(server);

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