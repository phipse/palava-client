/*
 * decaffeinate suggestions:
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS208: Avoid top-level this
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
//= require ./browser

const {
  palava
} = this;

// Class representing a participant in a room
//
palava.Peer = class Peer extends this.EventEmitter {

  // @param id [String] ID of the participant
  // @param status [Object] An object conataining state which is exchanged through the palava machine
  // @option staus name [String] The chosen name of the participant
  //
  constructor(id, status) {
    super();

    this.transmitsAudio = this.transmitsAudio.bind(this);
    this.hasAudio = this.hasAudio.bind(this);
    this.transmitsVideo = this.transmitsVideo.bind(this);
    this.hasVideo = this.hasVideo.bind(this);
    this.hasError = this.hasError.bind(this);
    this.getError = this.getError.bind(this);
    this.isMuted = this.isMuted.bind(this);
    this.isReady = this.isReady.bind(this);
    this.isLocal = this.isLocal.bind(this);
    this.isRemote = this.isRemote.bind(this);
    this.id     = id;
    this.status = status || {};

    if (!this.status.user_agent) {
      this.status.user_agent = palava.browser.getUserAgent();
    }

    this.joinTime = (new Date()).getTime();
    this.ready  = false;
    this.error  = null;
  }

  // Checks whether the participant is sending audio
  //
  // @return [Boolean] `true` if participant is sending audio
  //
  transmitsAudio() {
    return !!__guard__(__guard__(__guard__(this.getStream(), x2 => x2.getAudioTracks()), x1 => x1[0]), x => x.enabled);
  }

  // Checks whether the participant is could send audio (but maybe has it muted)
  //
  // @return [Boolean] `true` if participant has audio tracks
  //
  hasAudio() {
    return !!__guard__(__guard__(this.getStream(), x1 => x1.getAudioTracks()), x => x[0]);
  }

  // Checks whether the participant is sending audio
  //
  // @return [Boolean] `true` if participant is sending audio
  //
  transmitsVideo() {
    return !!__guard__(__guard__(__guard__(this.getStream(), x2 => x2.getVideoTracks()), x1 => x1[0]), x => x.enabled);
  }

  // Checks whether the participant is could send video (but maybe put in on hold)
  //
  // @return [Boolean] `true` if participant has audio tracks
  //
  hasVideo() {
    return !!__guard__(__guard__(this.getStream(), x1 => x1.getVideoTracks()), x => x[0]);
  }

  // Checks whether the peer connection is somewhat erroneous
  //
  // @return [Boolean] `true` if participant connection has an error
  //
  hasError() { if (this.error) {  return true; } else { return false; } }

  // Returns the error message of the peer
  //
  // @return [String] error message
  //
  getError() { return this.error; }

  // Checks whether the participant is muted
  //
  // @return [Boolean] `true` if participant is muted
  //
  isMuted() { if (this.muted) {  return true; } else { return false; } }

  // Checks whether the peer is ready
  //
  // @return [Boolean] `true` if participant is ready, that they have a stream
  //
  isReady() { if (this.ready) {  return true; } else { return false; } }

  // Checks whether the participant is local
  //
  // @return [Boolean] `true` if participant is the local peer
  //
  isLocal() { if (this.local) {  return true; } else { return false; } }

  // Checks whether the participant is remote
  //
  // @return [Boolean] `true` if participant is the remote peer
  //
  isRemote() { if (this.local) {  return false; } else { return true; } }
};

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
