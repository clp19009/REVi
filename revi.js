const http = require('http');
const socketio = require('socket.io');
const fs = require('fs');
const path = require('path');
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
    case '.json':
      readFileHandler(requestURL, 'application/json', true, response);
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

var peerIds = {};

io.sockets.on('connection', function (socket) {
  var room = '';
  var name = '';

  socket.on('client_to_server_join', function (data) {
    console.log("new join @ " + data.value);
    room = data.value;
    socket.join(room);
  });

  socket.on('IDpair', function (data) {
    console.log(data.pair + " @server");
    if (typeof (peerIds[room]) === "undefined") {
      peerIds[room] = {};
    }
    peerIds[room][data.pair[1]] = data.pair[0];
    console.log(peerIds);
    io.to(room).emit('screen', { pair: data.pair });
  });
});
