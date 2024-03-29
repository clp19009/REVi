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
const api_key = "55578595-05e9-4b88-bf24-5e93617f3ff0";
var names = {};

io.sockets.on('connection', function (socket) {
  var room = '';
  var name = '';

  socket.on('client_to_server_join', function (data) {
    console.log('Room: ' + data.room + ' Name: ' + data.name + ' PeerID: ' + data.peerId);
    room = data.room;
    name = data.name;
    socket.join(room);
    if (names[data.room] == null)
      names[data.room] = {};
    names[data.room][data.peerId] = data.name != '' ? data.name : "名無しさん";

    Object.keys(names[data.room]).forEach(function (key) {
      var value = this[key];
      if (key != data.peerId)
        io.to(socket.id).emit('name', { name: names[data.room][key], peerId: value });
    }, names[data.room]);
  });

  socket.on('key_request', function () {
    io.to(socket.id).emit('api_key', { key: api_key });
  });

  socket.on('name_request', function (data) {
    io.to(socket.id).emit('name', { name: names[data.room][data.peerId], peerId: data.peerId });
  });

  socket.on('name_request_stream', function (data) {
    io.to(socket.id).emit('name_stream', { name: names[data.room][data.peerId], peerId: data.peerId });
  });

  socket.on('client_to_server_exit', function (data) {
    console.log('exit: ' + names[data.room][data.peerId]);
    io.to(room).emit('remove_name', { name: names[data.room][data.peerId], peerId: data.peerId });
    delete names[data.room][data.peerId];
    if (Object.keys(names[data.room]).length == 0)
      delete names[data.room];
  });
});
