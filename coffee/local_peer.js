/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS208: Avoid top-level this
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
//= require ./browser
//= require ./peer

const {
  palava
} = this;

// A specialized peer representing the local user in the conference
palava.LocalPeer = class LocalPeer extends palava.Peer {

  // @param id [String] Unique ID of the local peer in the conference
  // @param status [Object] An object conataining state which is exchanged through the palava machine (see `palava.Peer` for more informations)
  // @param room [palava.Room] The room in which the peer is present
  constructor(id, status, room) {
    super(id, status);

    this.setupUserMedia = this.setupUserMedia.bind(this);
    this.setupRoom = this.setupRoom.bind(this);
    this.getStream = this.getStream.bind(this);
    this.updateStatus = this.updateStatus.bind(this);
    this.disableAudio = this.disableAudio.bind(this);
    this.enableAudio = this.enableAudio.bind(this);
    this.disableVideo = this.disableVideo.bind(this);
    this.enableVideo = this.enableVideo.bind(this);
    this.leave = this.leave.bind(this);

    this.muted    = true; // currently refers to displaying of local stream, not the sent one
    this.local    = true;

    this.room = room;
    this.userMedia = room.userMedia;

    this.setupRoom();
    this.setupUserMedia();
  }

  // Initializes the events based on the userMedia
  //
  // @nodoc
  //
  setupUserMedia() {
    this.userMedia.on('stream_released', () => {
      this.ready = false;
      return this.emit('stream_removed');
    });
    this.userMedia.on('stream_ready', e => {
      this.ready = true;
      return this.emit('stream_ready', e);
    });
    this.userMedia.on('stream_error', e => {
      return this.emit('stream_error', e);
    });
    if (this.getStream()) {
      this.ready = true;
      return this.emit('stream_ready');
    }
  }

  // Initializes the events based on the room
  //
  // @nodoc
  //
  setupRoom() {
    this.room.peers[this.id] = (this.room.localPeer = this);
    this.on('update',         () => this.room.emit('peer_update', this));
    this.on('stream_ready',   () => this.room.emit('peer_stream_ready', this));
    return this.on('stream_removed', () => this.room.emit('peer_stream_removed', this));
  }

  // Returns the local stream
  //
  // @return [MediaStream] The local stream as defined by the WebRTC API
  //
  getStream() {
    return this.userMedia.getStream();
  }

  // Updates the status of the local peer. The status is extended or updated with the given items.
  //
  // @param status [Object] Object containing the new items
  //
  updateStatus(status) {
    if (!status || !(status instanceof Object) || (Object.keys(status).length === 0)) { return status; }
    for (let key in status) { this.status[key] = status[key]; }
    if (!this.status.user_agent) { this.status.user_agent = palava.browser.getUserAgent(); }
    this.room.channel.send({ // TODO clarify how to send stuff
      event: 'update_status',
      status: this.status
    });
    return this.status;
  }

  disableAudio() {
    if (!this.ready) { return; }
    return Array.from(this.getStream().getAudioTracks()).map((track) =>
      (track.enabled = false));
  }

  enableAudio() {
    if (!this.ready) { return; }
    return Array.from(this.getStream().getAudioTracks()).map((track) =>
      (track.enabled = true));
  }

  disableVideo() {
    if (!this.ready) { return; }
    return Array.from(this.getStream().getVideoTracks()).map((track) =>
      (track.enabled = false));
  }

  enableVideo() {
    if (!this.ready) { return; }
    return Array.from(this.getStream().getVideoTracks()).map((track) =>
      (track.enabled = true));
  }

  // Leave the room
  leave() {
    this.ready = false;
    // @emit 'stream_removed'
    // TODO: nobody listens on this?
    return this.emit('left');
  }
};
