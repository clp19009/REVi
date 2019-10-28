const Peer = window.Peer;

(async function main() {
  const localVideo = document.getElementById('local_video');
  const local_sign = document.getElementById('local');
  const remoteVideos = document.getElementById('remote_videos');
  const screenTrigger = document.getElementById('screen');
  const cameraTrigger = document.getElementById('camera');
  const watchTrigger = document.getElementById('watch');
  const leaveTrigger = document.getElementById('leave');
  const roomId_form = document.getElementById('rooms');
  const camera_selector = document.getElementById('camera_selector');
  const nameList = document.getElementById('name_list');
  camera_selector.style.display = 'none';
  localVideo.hidden = true;
  local_sign.hidden = true;
  leaveTrigger.disabled = true;
  var is_shared = false;
  var socket = io.connect();
  var peer;

  const browser = await get_browser(window.navigator.userAgent.toLowerCase());
  console.log(browser);

  socket.emit("key_request", {});
  socket.on('api_key', function (data) {
    peer = new Peer({
      key: data.key,
      debug: 2,
      sdpSemantics: "unified-plan"
    });
  });

  var localStream = null;
  window.addEventListener("message", first_listen);
  function first_listen(event) {
    if (event.data.direction == "streamId") {
      console.log("receive");
      get_user_media(event.data.message, "local_video", "screen");
      window.removeEventListener("message", first_listen);
    }
  };

  var set_interval_id4peer = setInterval(wait_peer, 500);
  async function wait_peer() {
    if (peer != null) {
      set_event();
      clearInterval(set_interval_id4peer);
    }
  }

  // apply name
  socket.on("name", function (data) {
    const list = document.getElementById('name_list');
    var name = document.createElement('div');
    name.innerText = data.name != '' ? data.name : '名無しさん';
    name.className = 'name_list';
    name.id = data.peerId + 'name';
    list.appendChild(name);
  });

  socket.on("name_stream", function (data) {
    const video = document.getElementById(data.peerId);
    if (video != null) {
      const name = document.createElement('span');
      name.innerText = data.name != '' ? data.name : '名無しさん';
      video.appendChild(name);
    }
  });

  socket.on("remove_name", function (data) {
    var name = document.getElementById(data.peerId + 'name');
    if (name != null) name.remove();
  });

  // functions ///////////////////////////////////////////////////

  // get browser information
  function get_browser(userAgent) {
    if (userAgent.indexOf('opera') != -1) {
      return 'opera';
    } else if (userAgent.indexOf('msie') != -1) {
      return 'ie';
    } else if (userAgent.indexOf('chrome') != -1) {
      return 'chrome';
    } else if (userAgent.indexOf('safari') != -1) {
      return 'safari';
    } else if (userAgent.indexOf('gecko') != -1) {
      return 'gecko';
    } else {
      return false;
    }
  }

  // listen event
  function set_event() {
    watchTrigger.addEventListener('click', watch, { once: true });
    async function watch() {
      localVideo.hidden = true;
      local_sign.hidden = true;
      await screenTrigger.removeEventListener('click', screen);
      await cameraTrigger.removeEventListener('click', camera);
      await watchTrigger.removeEventListener('click', watch);
      console.log('watch');
      is_shared = false;
      join_room("watch");
    };

    screenTrigger.addEventListener('click', screen, { once: true });
    async function screen() {
      localVideo.hidden = false;
      local_sign.hidden = false;
      await screenTrigger.removeEventListener('click', screen);
      await cameraTrigger.removeEventListener('click', camera);
      await watchTrigger.removeEventListener('click', watch);
      is_shared = true;
      switch (browser) {
        case 'chrome':
          window.postMessage("share");
          break;
        default:
          get_user_media("", "local_video", "screen");
      }
      join_room("screen");
    };

    cameraTrigger.addEventListener('click', camera, { once: true });
    async function camera() {
      localVideo.hidden = false;
      local_sign.hidden = false;
      await screenTrigger.removeEventListener('click', screen);
      await cameraTrigger.removeEventListener('click', camera);
      await watchTrigger.removeEventListener('click', watch);
      is_shared = true;
      get_user_media("", "local_video", "camera");
      join_room("camera");
    };
  }

  async function join_room(mode) {
    switch (mode) {
      case "screen":
      case "camera":
        var set_interval_id = setInterval(wait, 1000);
        async function wait() {
          console.log("wait");
          if (localStream != null) {
            console.log("break");
            clearInterval(set_interval_id);
            var room = await peer.joinRoom($("#rooms").val() + 0, {
              mode: 'mesh',
              stream: localStream
            });
            prepare4share(room);
            socket.emit("client_to_server_join", { room: $("#rooms").val() + 0, name: $("#name").val(), peerId: peer.id });
          }
        }
        break;
      case "watch":
        var room = await peer.joinRoom($("#rooms").val() + 0, {
          mode: 'mesh',
          stream: null
        });
        prepare4share(room);
        socket.emit("client_to_server_join", { room: $("#rooms").val() + 0, name: $("#name").val(), peerId: peer.id });
        break;
      default:
    }
  }

  // capture
  function get_user_media(streamId, videoId, mode) {
    switch (mode) {
      case 'screen':
        switch (browser) {
          case 'chrome':
            navigator.mediaDevices.getUserMedia({
              video: {
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: streamId
                }
              },
              audio: {
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: streamId
                }
              }
            }).then(stream => {
              localStream = stream;
              document.getElementById(videoId).srcObject = localStream;
              let deviceId = stream.getVideoTracks()[0].getConstraints().deviceId;
              if (typeof deviceId === 'object') {
                deviceId = JSON.stringify(deviceId);
              }
              console.log(`stream.getConstraints().deviceId=${deviceId}`);

              // catch 'ended'
              stream.getVideoTracks().forEach(track => {
                track.addEventListener('ended', function () {
                  console.log("ended");
                  window.postMessage({ direction: "stream_event", message: "ended" }, "*");
                }, { once: true });
              });
            }).catch(async err => {
              console.error(err);
              /*
              switch (err.name) {
                default:
                  localVideo.hidden = true;
                  local_sign.hidden = true;
                  await screenTrigger.removeEventListener('click', screen);
                  await cameraTrigger.removeEventListener('click', camera);
                  await watchTrigger.removeEventListener('click', watch);
                  is_shared = false;
                  const roomId = await $("#rooms").val() + 0;
                  var room = await peer.joinRoom(roomId, {
                    mode: 'mesh',
                    stream: null
                  });
                  prepare4share(room);
                  console.log('nyan');
                  break;
              }
              */
            });
            break;
          default:
            const is_screen = window.confirm('あなたが共有したいのはスクリーン全体ですか?');
            navigator.mediaDevices.getUserMedia({
              video: { mediaSource: is_screen ? 'screen' : 'window' },
              audio: { mediaSource: 'audioCapture' }
            }).then(stream => {
              localStream = stream;
              document.getElementById(videoId).srcObject = localStream;
              let deviceId = stream.getVideoTracks()[0].getConstraints().deviceId;
              if (typeof deviceId === 'object') {
                deviceId = JSON.stringify(deviceId);
              }
              console.log(`stream.getConstraints().deviceId=${deviceId}`);

              // catch 'ended'
              stream.getVideoTracks().forEach(track => {
                track.addEventListener('ended', function () {
                  console.log("ended");
                  window.postMessage({ direction: "stream_event", message: "ended" }, "*");
                }, { once: true });
              });
            }).catch(async err => {
              console.error(err);
              switch (err.name) {
                default:
                  localVideo.hidden = true;
                  local_sign.hidden = true;
                  await screenTrigger.removeEventListener('click', screen);
                  await cameraTrigger.removeEventListener('click', camera);
                  await watchTrigger.removeEventListener('click', watch);
                  is_shared = false;
                  const roomId = await $("#rooms").val() + 0;
                  var room = await peer.joinRoom(roomId, {
                    mode: 'mesh',
                    stream: null
                  });
                  prepare4share(room);
                  console.log('nyan');
                  break;
              }
            });;
        }
        break;
      case 'camera':
        const is_mic = window.confirm('マイク入力を共有しますか?');
        navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment"
          },
          audio: is_mic
        }).then(stream => {
          localStream = stream;
          document.getElementById(videoId).srcObject = localStream;
          let deviceId = stream.getVideoTracks()[0].getConstraints().deviceId;
          if (typeof deviceId === 'object') {
            deviceId = JSON.stringify(deviceId);
          }
          console.log(`stream.getConstraints().deviceId=${deviceId}`);

          // catch 'ended'
          stream.getVideoTracks().forEach(track => {
            track.addEventListener('ended', function () {
              console.log("ended");
              window.postMessage({ direction: "stream_event", message: "ended" }, "*");
            }, { once: true });
          });
        }).catch(async err => {
          console.error(err);
          switch (err.name) {
            default:
              localVideo.hidden = true;
              local_sign.hidden = true;
              await screenTrigger.removeEventListener('click', screen);
              await cameraTrigger.removeEventListener('click', camera);
              await watchTrigger.removeEventListener('click', watch);
              is_shared = false;
              const roomId = await $("#rooms").val() + 0;
              var room = await peer.joinRoom(roomId, {
                mode: 'mesh',
                stream: null
              });
              prepare4share(room);
              console.log('nyan');
              break;
          }
        });;
        break;
    }
  }

  // share
  async function prepare4share(room) {
    console.log('prepare');
    roomId_form.disabled = true;
    leaveTrigger.disabled = false;

    room.on('stream', stream => {
      console.log(stream.peerId);
      if (stream != null) {
        const newVideo = document.createElement('video');
        newVideo.setAttribute('id', stream.peerId + 'video');
        newVideo.autoplay = true;
        newVideo.controls = true;
        newVideo.srcObject = stream;
        // await newVideo.play().catch(console.error);
        const area = document.createElement('div');
        area.appendChild(newVideo);
        area.setAttribute('class', 'video_area');
        area.setAttribute('id', stream.peerId);
        remoteVideos.append(area);

        socket.emit("name_request_stream", { room: $("#rooms").val() + 0, peerId: stream.peerId });
      }
    });

    room.on('peerJoin', peerId => {
      socket.emit("name_request", { room: $("#rooms").val() + 0, peerId: peerId });
    });

    room.on('peerLeave', peerId => {
      console.log(peerId);
      console.log("remove");
      remoteVideo = document.getElementById(peerId + 'video');
      if (remoteVideo != null) {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        remoteVideo.remove();
        Array.from(document.getElementById(peerId).getElementsByTagName('span')).forEach(sign => {
          console.log("remove_sign");
          sign.remove();
        });
      }
    });

    room.once('close', async () => {
      console.log("remove");
      await Array.from(remoteVideos.getElementsByTagName('video')).forEach(remoteVideo => {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        remoteVideo.remove();
      });
      Array.from(remoteVideos.getElementsByTagName('span')).forEach(sign => {
        sign.remove();
      });
      Array.from(nameList.getElementsByTagName('div')).forEach(name => {
        name.remove();
      });
      if (localStream != null) {
        await localStream.getTracks().forEach(function (track) {
          track.stop();
        });
      }
      await window.removeEventListener("message", listen_message);
      await screenTrigger.removeEventListener('click', change2screen);
      await cameraTrigger.removeEventListener('click', change2camera);
      await watchTrigger.removeEventListener('click', change2watch);
      roomId_form.disabled = false;
      leaveTrigger.disabled = true;
      socket.emit("client_to_server_exit", { room: $("#rooms").val() + 0, peerId: peer.id });
      set_event();
    });

    room.on('data', async ({ data, src }) => {
      console.log(data);
      var remoteVideo = document.getElementById(src + 'video');
      if (remoteVideo != null) {
        switch (data) {
          case "watch":
            remoteVideo.hidden = true;
            break;
          case "share":
            remoteVideo.hidden = false;
            break;
        }
      }
    });

    window.addEventListener("message", listen_message);
    async function listen_message(event) {
      switch (event.data.direction) {
        case 'streamId':
          await get_user_media(event.data.message, "local_video", "screen");
          var set_interval_id = setInterval(wait, 1000);
          function wait() {
            if (localStream != null) {
              clearInterval(set_interval_id);
              room.replaceStream(localStream);
              room.send('share');
              console.log("replace");
            }
          }
          break;
        case 'stream_event':
          switch (event.data.message) {
            case 'ended':
              change2watch();
              break;
          }
          break;
      }
    };

    screenTrigger.addEventListener('click', change2screen);
    async function change2screen() {
      localVideo.hidden = false;
      local_sign.hidden = false;
      if (localStream != null) {
        await localStream.getTracks().forEach(function (track) {
          track.stop();
        });
        localStream = null;
      }
      switch (browser) {
        case 'chrome':
          window.postMessage("share");
          break;
        default:
          window.postMessage({ direction: "streamId", message: "" }, "*");
      }
      is_shared = true;
    };

    cameraTrigger.addEventListener('click', change2camera);
    async function change2camera() {
      localVideo.hidden = false;
      local_sign.hidden = false;
      if (localStream != null) {
        await localStream.getTracks().forEach(function (track) {
          track.stop();
        });
        localStream = null;
      }
      await get_user_media("", "local_video", 'camera');
      var set_interval_id = setInterval(wait, 1000);
      function wait() {
        if (localStream != null) {
          clearInterval(set_interval_id);
          room.replaceStream(localStream);
          room.send('share');
          console.log("replace");
        }
      }
      is_shared = true;
    };

    watchTrigger.addEventListener('click', change2watch);
    async function change2watch() {
      localVideo.hidden = true;
      local_sign.hidden = true;
      is_shared = false;
      if (localStream != null) {
        await localStream.getTracks().forEach(async function (track) {
          await track.stop();
          localStream.removeTrack(track);
        });
      }
      room.send("watch");
    };

    leaveTrigger.addEventListener('click', () => {
      console.log('close');
      localVideo.hidden = true;
      local_sign.hidden = true;
      room.close();
    }, { once: true });

    peer.on('error', console.error);
  }
})();