const defaultExport = {};
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * DS208: Avoid top-level this
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

import * as distributor from "distributor"
import * as local_peer from "local_peer"
import * as remote_peer from "remote_peer"
import * as browser from "browser"

// A room connecting multiple participants
//
defaultExport.Room = class Room extends defaultExport.EventEmitter {

  // @param roomId [String] ID of the room
  // @param channel [palava.Channel] Channel used for communication
  // @param userMedia [UserMedia] UserMedia used for local user
  // @param options [Object] Further objects for the room
  // @option options joinTimeout [Integer] Timeout for joining
  // @option options ownStatus [Object] The status of the local user
  //
  constructor(roomId, channel, userMedia, options) {
    super();

    this.setupUserMedia = this.setupUserMedia.bind(this);
    this.setupOptions = this.setupOptions.bind(this);
    this.setupDistributor = this.setupDistributor.bind(this);
    this.join = this.join.bind(this);
    this.leave = this.leave.bind(this);
    this.destroy = this.destroy.bind(this);
    this.getPeerById = this.getPeerById.bind(this);
    this.getLocalPeer = this.getLocalPeer.bind(this);
    this.getRemotePeers = this.getRemotePeers.bind(this);
    this.getAllPeers = this.getAllPeers.bind(this);
    if (options == null) { options = {}; }
    this.id        = roomId;
    this.userMedia = userMedia;
    this.channel   = channel;
    this.peers   = {};
    this.options   = options;

    this.setupUserMedia();
    this.setupDistributor();
    this.setupOptions();
  }

  // Bind UserMedia events to room events
  //
  // @nodoc
  //
  setupUserMedia() {
    this.userMedia.on('stream_ready', stream => this.emit('local_stream_ready', stream));
    this.userMedia.on('stream_error', error  => this.emit('local_stream_error', error));
    return this.userMedia.on('stream_released',       () => this.emit('local_stream_removed'));
  }


  // Set default options
  //
  // @nodoc
  //
  setupOptions() {
    if (!this.options.joinTimeout) { this.options.joinTimeout = 1000; }
    if (!this.options.ownStatus) { this.options.ownStatus = {}; }
    return this.options.filterIceCandidateTypes || (this.options.filterIceCandidateTypes = []);
  }

  // Initialize global distributor and messaging
  //
  // @nodoc
  //
  setupDistributor() {
    this.distributor = new distributor.Distributor(this.channel);

    this.distributor.on('joined_room', msg => {
      let turnCredentials;
      clearTimeout(this.joinCheckTimeout);
      if (msg.turn_user) {
        turnCredentials = { user: msg.turn_user, password: msg.turn_password };
      } else {
        turnCredentials = null;
      }
      new local_peer.LocalPeer(msg.own_id, this.options.ownStatus, this);
      for (let peer of Array.from(msg.peers)) {
        const offers = !browser.browser.isChrome();
        const newPeer = new remote_peer.RemotePeer(
	  peer.peer_id,
	  peer.status,
	  this,
	  offers,
	  turnCredentials);
      }
      return this.emit("joined");
    });

    this.distributor.on('new_peer', msg => {
      const offers = msg.status.user_agent === 'chrome';
      const newPeer = new remote_peer.RemotePeer(msg.peer_id, msg.status, this, offers);
      return this.emit('peer_joined', newPeer);
    });

    this.distributor.on('error',
      msg => this.emit('signaling_error', 'server', msg.description));

    return this.distributor.on('shutdown',
      msg => this.emit('signaling_shutdown', msg.seconds));
  }

  // Join the room
  //
  // @param status [Object] Status of the local user
  //
  join(status) {
    if (status == null) { status = {}; }
    this.joinCheckTimeout = setTimeout(( () => {
      return this.emit('join_error');
    }
    ), this.options.joinTimeout);

    for (let key of Array.from(status)) { this.options.ownStatus[key] = status[key]; }
    if (!this.options.ownStatus.user_agent) {
      this.options.ownStatus.user_agent = browser.browser.getUserAgent();
    }

    return this.distributor.send({
      event: 'join_room',
      room_id: this.id,
      status: this.options.ownStatus
    });
  }

  // Send leave room event to server
  //
  leave() {
    if (this.channel) {
      this.distributor.send({
        event: 'leave_room'});
    }
    return this.emit('left');
  }

  // Makes sure room is closed by disconnecting all peer connections and clearing all timeouts
  //
  destroy() {
    this.getRemotePeers().forEach(peer => {
      return peer.closePeerConnection();
    });
    return clearTimeout(this.joinCheckTimeout);
  }

  // Find peer with the given id
  //
  // @param id [String] id of the searched peer
  //
  // @return [palava.Peer] The peer with the given id or `undefined`
  //
  getPeerById(id) { return this.peers[id]; }

  // Get local peer
  //
  // @return [palava.Peer] The local peer
  //
  getLocalPeer() { return this.localPeer; }

  // Get remote peers
  //
  // @return [Array] All peers except the local peer
  //
  getRemotePeers() { return this.getAllPeers(false); }

  // Get all peers
  //
  // @return [Array] All peers including the local peer
  //
  getAllPeers(allowLocal) {
    if (allowLocal == null) { allowLocal = true; }
    const peers = [];
    for (let id in this.peers) {
      const peer = this.peers[id];
      if (allowLocal || !peer.local) {
        peers.push(peer);
      }
    }
    return peers;
  }
};
export default defaultExport;
