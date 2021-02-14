const defaultExport = {};
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * DS208: Avoid top-level this
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
//= require ./browser
//= require ./web_socket_channel

const {
  palava
} = defaultExport;

// Session is a wrapper around a concrete room, channel and userMedia
palava.Session = class Session extends defaultExport.EventEmitter {
  // Creates the session object
  //
  // @param o [Object] See Session#connect for available options
  //
  constructor(o) {
    super();

    this.connect = this.connect.bind(this);
    this.reconnect = this.reconnect.bind(this);
    this.tearDown = this.tearDown.bind(this);
    this.assignOptions = this.assignOptions.bind(this);
    this.checkRequirements = this.checkRequirements.bind(this);
    this.getChannel = this.getChannel.bind(this);
    this.getUserMedia = this.getUserMedia.bind(this);
    this.getRoom = this.getRoom.bind(this);
    this.createChannel = this.createChannel.bind(this);
    this.createRoom = this.createRoom.bind(this);
    this.destroy = this.destroy.bind(this);
    this.roomOptions = {};
    this.assignOptions(o);
  }

  // Initializes the websocket channel, retrieves user media and joins room when stream ready
  //
  // @param o [Object] Options for the session
  // @option o webSocketAddress [WebSocket] The websocket endpoint to connect to
  // @option o userMediaConfig [Object] getUserMedia constraints
  // @option o stun [String] Address of stun server
  // @option o turn [String] Turn address and credentials
  // @option o joinTimeout [Integer] Milliseconds till joining is canceled by throwing
  //           the "join_error" event
  //
  connect(o) {
    this.assignOptions(o);
    if (!this.checkRequirements()) { return; }

    this.createChannel();
    this.createRoom();

    if (this.userMedia.stream) {
      return this.room.join();
    } else {
      return this.userMedia.requestStream().then(() => {
        return this.room.join();
      });
    }
  }

  // Reconnect the session
  //
  reconnect() {
    this.emit('session_reconnect');
    this.tearDown();
    this.createChannel();
    this.createRoom();
    return this.room.join();
  }

  // Reset channel and room
  //
  // @param o [Object] Also release user media
  //
  tearDown(resetUserMedia) {
    if (resetUserMedia == null) { resetUserMedia = false; }
    if (this.room != null) {
      this.room.removeAllListeners();
    }
    if (this.channel != null) {
      this.channel.removeAllListeners();
    }
    if (this.channel != null ? this.channel.isConnected() : undefined) {
      if (this.room != null) {
        this.room.leave();
      }
    }
    if (this.channel != null) {
      this.channel.close();
    }
    this.channel = null;
    if (this.room != null) {
      this.room.destroy();
    }
    this.room = null;
    if (resetUserMedia && this.userMedia) {
      return this.userMedia.releaseStream();
    }
  }

  // Moves options into inner state
  //
  // @nodoc
  //
  assignOptions(o) {
    if (o.roomId) {
      this.roomId = o.roomId;
    }

    if (o.webSocketAddress) {
      this.webSocketAddress = o.webSocketAddress;
    }

    if (o.identity) {
      this.userMedia = o.identity.newUserMedia();
      this.roomOptions.ownStatus = o.identity.getStatus();
    }

    if (o.userMediaConfig) {
      this.userMedia = new palava.Gum(o.userMediaConfig);
    }

    if (o.dataChannels) {
      this.roomOptions.dataChannels = o.dataChannels;
    }

    if (o.stun) {
      this.roomOptions.stun = o.stun;
    }

    if (o.turnUrls) {
      this.roomOptions.turnUrls = o.turnUrls;
    }

    if (o.joinTimeout) {
      this.roomOptions.joinTimeout = o.joinTimeout;
    }

    if (o.filterIceCandidateTypes) {
      return this.roomOptions.filterIceCandidateTypes = o.filterIceCandidateTypes;
    }
  }

  // Checks whether the inner state of the session is valid. Emits events otherwise
  //
  // @return [Boolean] `true` if options are correct and webrtc support is given
  //
  checkRequirements() {
    let e;
    if (!this.webSocketAddress) {
      this.emit('argument_error', 'no web socket address given');
      return false;
    }
    if (!this.userMedia) {
      this.emit('argument_error', 'no user media given');
      return false;
    }
    if (!this.roomId) {
      this.emit('argument_error', 'no room id given');
      return false;
    }
    if (!this.roomOptions.stun) {
      this.emit('argument_error', 'no stun server given');
      return false;
    }
    if (this.roomOptions.turnUrls && !Array.isArray(this.roomOptions.turnUrls)) {
      this.emit('argument_error', 'turnUrls must be an array');
      return false;
    }
    if (!navigator.onLine) {
      this.emit('signaling_not_reachable');
      return false;
    }
    if (e = palava.browser.checkForWebrtcError()) {
      this.emit('webrtc_no_support', 'WebRTC is not supported by your browser', e);
      return false;
    }
    return true;
  }

  // Get the channel of the session
  //
  // @return [palava.Channel] The channel of the session
  //
  getChannel() { return this.channel; }

  // Get the UserMedia of the session
  //
  // @return [UserMedia] UserMedia of the session
  //
  getUserMedia() { return this.userMedia; }

  // Get the room of the session
  //
  // @return [palava.Room] Room of the session
  //
  getRoom() { return this.room; }

  // Build connection to websocket endpont
  //
  // @return [palava.Room] Room of the session
  //
  createChannel() {
    this.channel = new palava.WebSocketChannel(this.webSocketAddress);
    this.channel.on('open',              () => this.emit('signaling_open'));
    this.channel.on('error',      (t, e) => this.emit('signaling_error', t, e));
    this.channel.on('close',         e => this.emit('signaling_close', e));
    return this.channel.on('not_reachable',     () => this.emit('signaling_not_reachable'));
  }

  // Maps signals from room to session signals
  //
  // @nodoc
  //
  createRoom() { // TODO move some more stuff away from the room? eg signaling
    this.room = new palava.Room(this.roomId, this.channel, this.userMedia, this.roomOptions);
    this.room.on('local_stream_ready',      s => this.emit('local_stream_ready', s));
    this.room.on('local_stream_error',      e => this.emit('local_stream_error', e));
    this.room.on('local_stream_removed',        () => this.emit('local_stream_removed'));
    this.room.on('join_error',                  () => {
      this.tearDown(true);
      return this.emit('room_join_error', this.room);
    });
    this.room.on('full',                        () => this.emit('room_full',   this.room));
    this.room.on('joined',                      () => this.emit('room_joined', this.room));
    this.room.on('left',                        () => this.emit('room_left',   this.room));
    this.room.on('peer_joined',             p => this.emit('peer_joined', p));
    this.room.on('peer_offer',              p => this.emit('peer_offer', p));
    this.room.on('peer_answer',             p => this.emit('peer_answer', p));
    this.room.on('peer_update',             p => this.emit('peer_update', p));
    this.room.on('peer_stream_ready',       p => this.emit('peer_stream_ready', p));
    this.room.on('peer_stream_removed',     p => this.emit('peer_stream_removed', p));
    this.room.on('peer_connection_pending',      p => this.emit('peer_connection_pending', p));
    this.room.on('peer_connection_established',  p => this.emit('peer_connection_established', p));
    this.room.on('peer_connection_failed',       p => this.emit('peer_connection_failed', p));
    this.room.on('peer_connection_disconnected', p => this.emit('peer_connection_disconnected', p));
    this.room.on('peer_connection_closed',       p => this.emit('peer_connection_closed', p));
    this.room.on('peer_left',               p => this.emit('peer_left', p));
    this.room.on('peer_channel_ready',      (p, n, c) => this.emit('peer_channel_ready', p, n, c));
    this.room.on('signaling_shutdown',      p => this.emit('signaling_shutdown', p));
    this.room.on('signaling_error',      (t, e) => this.emit('signaling_error', t, e));
    return true;
  }

  // Destroys the session
  destroy() {
    this.emit('session_before_destroy');
    this.tearDown(true);
    return this.emit('session_after_destroy');
  }
};
export default defaultExport;
