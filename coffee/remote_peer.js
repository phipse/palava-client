const defaultExport = {};
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * DS208: Avoid top-level this
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
//= require ./browser
//= require ./peer
//= require ./distributor
//= require ./data_channel

const {
  palava
} = defaultExport;

export default defaultExport;

// TODO pack 'peer left' into 'send_to_peer' on server side

// A remote participant in a room
//
palava.RemotePeer = class RemotePeer extends palava.Peer {

  // @param id [String] ID of the participant
  // @param status [Object] Status object of the participant
  // @param room [palava.Room] Room the participant is in
  // @param offers [Boolean] If true, we send the offer, otherwise the peer
  // @param turnCredentials [Object] username and password for the turn server (optional)
  //
  constructor(id, status, room, offers, turnCredentials) {
    super(id, status);

    this.getStream = this.getStream.bind(this);
    this.toggleMute = this.toggleMute.bind(this);
    this.generateIceOptions = this.generateIceOptions.bind(this);
    this.setupPeerConnection = this.setupPeerConnection.bind(this);
    this.setupDistributor = this.setupDistributor.bind(this);
    this.setupRoom = this.setupRoom.bind(this);
    this.sendOffer = this.sendOffer.bind(this);
    this.sendAnswer = this.sendAnswer.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
    this.sdpSender = this.sdpSender.bind(this);
    this.oaError = this.oaError.bind(this);
    this.closePeerConnection = this.closePeerConnection.bind(this);

    this.muted = false;
    this.local = false;

    this.room = room;
    this.remoteStream = null;
    this.turnCredentials = turnCredentials;

    this.dataChannels = {};

    this.setupRoom();
    this.setupPeerConnection(offers);
    this.setupDistributor();

    if (offers) {
      this.sendOffer();
    }
  }

  // Get the stream
  //
  // @return [MediaStream] Remote stream as defined by WebRTC
  //
  getStream() {
    return this.remoteStream;
  }

  // Toggle the mute state of the peer
  //
  toggleMute() {
    return this.muted = !this.muted;
  }

  // Generates the STUN and TURN options for a peer connection
  //
  // @return [Object] ICE options for the peer connections
  //
  generateIceOptions() {
    const options = [];
    if (this.room.options.stun) {
      options.push({urls: [this.room.options.stun]});
    }
    if (this.room.options.turnUrls && this.turnCredentials) {
      options.push({
        urls: this.room.options.turnUrls,
        username: this.turnCredentials.user,
        credential: this.turnCredentials.password
      });
    }
    return {iceServers: options};
  }

  // Sets up the peer connection and its events
  //
  // @nodoc
  //
  setupPeerConnection(offers) {
    this.peerConnection = new RTCPeerConnection(this.generateIceOptions(), palava.browser.getPeerConnectionOptions());

    this.peerConnection.onicecandidate = event => {
      if (event.candidate) {
        return this.distributor.send({
          event: 'ice_candidate',
          sdpmlineindex: event.candidate.sdpMLineIndex,
          sdpmid: event.candidate.sdpMid,
          candidate: event.candidate.candidate
        });
      }
    };

    this.peerConnection.ontrack = event => {
      this.remoteStream = event.streams[0];
      this.ready = true;
      return this.emit('stream_ready');
    };

    this.peerConnection.onremovestream = event => {
      this.remoteStream = null;
      this.ready = false;
      return this.emit('stream_removed');
    };

    this.peerConnection.oniceconnectionstatechange = event => {
      const connectionState = event.target.iceConnectionState;

      switch (connectionState) {
        case 'connecting':
          this.error = null;
          return this.emit('connection_pending');
        case 'connected':
          this.error = null;
          return this.emit('connection_established');
        case 'failed':
          this.error = "connection_failed";
          return this.emit('connection_failed');
        case 'disconnected':
          this.error = "connection_disconnected";
          return this.emit('connection_disconnected');
        case 'closed':
          this.error = "connection_closed";
          return this.emit('connection_closed');
      }
    };

    // TODO onsignalingstatechange

    if (this.room.localPeer.getStream()) {
      this.peerConnection.addStream(this.room.localPeer.getStream());
    }
    else {}
      // not suppored yet

    // data channel setup

    if (this.room.options.dataChannels != null) {
      let channel;
      const registerChannel = channel => {
        const name = channel.label;
        const wrapper = new palava.DataChannel(channel);
        this.dataChannels[name] = wrapper;
        return this.emit('channel_ready', name, wrapper);
      };

      if (offers) {
        for (let label in this.room.options.dataChannels) {
          const options = this.room.options.dataChannels[label];
          channel = this.peerConnection.createDataChannel(label, options);

          channel.onopen = function() {
            return registerChannel(this);
          };
        }
      } else {
        this.peerConnection.ondatachannel = event => {
          return registerChannel(event.channel);
        };
      }
    }

    return this.peerConnection;
  }

  // Sets up the distributor connecting to the participant
  //
  // @nodoc
  //
  setupDistributor() {
    // TODO _ in events also in rtc-server
    // TODO consistent protocol naming
    this.distributor = new palava.Distributor(this.room.channel, this.id);

    this.distributor.on('peer_left', msg => {
      if (this.ready) {
        this.remoteStream = null;
        this.emit('stream_removed');
        this.ready = false;
      }
      this.peerConnection.close();
      return this.emit('left');
    });

    this.distributor.on('ice_candidate', msg => {
      // empty msg.candidate causes error messages in firefox, so let RTCPeerConnection deal with it and return here
      if (msg.candidate === "") { return; }
      const candidate = new RTCIceCandidate({candidate: msg.candidate, sdpMLineIndex: msg.sdpmlineindex, sdpMid: msg.sdpmid});
      if (!this.room.options.filterIceCandidateTypes.includes(candidate.type)) {
        return this.peerConnection.addIceCandidate(candidate);
      }
    });

    this.distributor.on('offer', msg => {
      this.peerConnection.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      this.emit('offer'); // ignored so far
      return this.sendAnswer();
    });

    this.distributor.on('answer', msg => {
      this.peerConnection.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      return this.emit('answer');
    }); // ignored so far

    this.distributor.on('peer_updated_status', msg => {
      this.status = msg.status;
      return this.emit('update');
    });

    this.distributor.on('message', msg => {
      return this.emit('message', msg.data);
    });

    return this.distributor;
  }

  // Forward events to the room
  //
  // @nodoc
  //
  setupRoom() {
    this.room.peers[this.id] = this;
    this.on('left', () => {
      delete this.room.peers[this.id];
      return this.room.emit('peer_left', this);
    });
    this.on('offer',          () => this.room.emit('peer_offer', this));
    this.on('answer',         () => this.room.emit('peer_answer', this));
    this.on('update',         () => this.room.emit('peer_update', this));
    this.on('stream_ready',   () => this.room.emit('peer_stream_ready', this));
    this.on('stream_removed', () => this.room.emit('peer_stream_removed', this));
    this.on('connection_pending',      () => this.room.emit('peer_connection_pending', this));
    this.on('connection_established',  () => this.room.emit('peer_connection_established', this));
    this.on('connection_failed',       () => this.room.emit('peer_connection_failed', this));
    this.on('connection_disconnected', () => this.room.emit('peer_connection_disconnected', this));
    this.on('connection_closed',       () => this.room.emit('peer_connection_closed', this));
    this.on('oaerror',    e => this.room.emit('peer_oaerror', this, e));
    return this.on('channel_ready', (n, c) => this.room.emit('peer_channel_ready', this, n, c));
  }

  // Sends the offer for a peer connection
  //
  // @nodoc
  //
  sendOffer() {
    return this.peerConnection.createOffer(this.sdpSender('offer'),  this.oaError, palava.browser.getConstraints());
  }

  // Sends the answer to create a peer connection
  //
  sendAnswer() {
    return this.peerConnection.createAnswer(this.sdpSender('answer'), this.oaError, palava.browser.getConstraints());
  }

  sendMessage(data) {
    return this.distributor.send({
      event: 'message',
      data
    });
  }

  // Helper for sending sdp
  //
  // @nodoc
  //
  sdpSender(event) {
    return sdp => {
      this.peerConnection.setLocalDescription(sdp);
      return this.distributor.send({
        event,
        sdp
      });
    };
  }

  // TODO: what is this?
  //
  // @nodoc
  //
  oaError(error) {
    return this.emit('oaerror', error);
  }

  // End peer connection
  //
  closePeerConnection() {
    if (this.peerConnection != null) {
      this.peerConnection.close();
    }
    return this.peerConnection = null;
  }
};
