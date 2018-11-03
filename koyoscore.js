const http = require('http');
const socketio = require('socket.io');
const fs = require('fs');
const path = require('path');

var score_a = new Map();
var score_b = new Map();
var scores_a = new Array();
var scores_b = new Array();
var scores_list = new Map();
var scores_index = 0;
var scores_head = new Map();
const scores_len_max = 10;

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
                    } else {
                        response.end(data, 'binary');
                    }
                }
            });
        } else {
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
	if (typeof score_a.get(room) === "undefined") {
	  score_a.set(room, 0);
	  score_b.set(room, 0);
          scores_list.set(room, scores_index);
          scores_index++;
	  scores_head.set(room, 0);
	  scores_a[scores_list.get(room)] = new Array(scores_len_max);
	  scores_b[scores_list.get(room)] = new Array(scores_len_max);
	}
    });

    socket.on('team_all', function (data) {
        switch (data.value) {
            case "back":
                if (scores_head.get(room) > 1) {
                    score_a.set(room, scores_a[scores_list.get(room)][scores_head.get(room)]);
                    score_b.set(room, scores_b[scores_list.get(room)][scores_head.get(room)]);
		    scores_head.set(room, scores_head.get(room) - 1);
                } else {
		    console.log("failed: back");
		}
                break;
            case "reset":
                score_a.set(room, 0);
                score_b.set(room, 0);
		push_score();
                break;
	    case "init":
	    default:
        }
    	emit_score(data);
	debug(data);
    });

    socket.on('team_a', function (data) {
	score_a.set(room, score_a.get(room) + data.value);
	push_score();
    	emit_score(data);
	debug(data);
    });

    socket.on('team_b', function (data) {
	score_b.set(room, score_b.get(room) + data.value);
	push_score();
    	emit_score(data);
	debug(data);
    });

    function push_score () {
      if (scores_head.get(room) < scores_len_max - 2) {
        scores_head.set(room, scores_head.get(room) + 1);
      } else {
        for (var i = 1; i < scores_len_max; i++) {
          scores_a[scores_list.get(room)][i - 1] = scores_a[scores_list.get(room)][i] ;
          scores_b[scores_list.get(room)][i - 1] = scores_b[scores_list.get(room)][i] ;
	}
      }
      scores_a[scores_list.get(room)][scores_head.get(room) + 1] = score_a.get(room);
      scores_b[scores_list.get(room)][scores_head.get(room) + 1] = score_b.get(room);
    }

    function emit_score (data) { 
      io.to(room).emit('score', { score_a: score_a.get(room), score_b: score_b.get(room) });
    }

    function debug (data) {
      console.log("score A: " + score_a.get(room) + " B: " + score_b.get(room) + "  input: " + data.value + " @" + room);
      console.log(score_a);
    }
});
