const defaultExport = {};
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS208: Avoid top-level this
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
//= require ./browser

const {
  palava
} = defaultExport;

palava.Gum = class Gum extends defaultExport.EventEmitter {
  constructor(config) {
    super();

    this.changeConfig = this.changeConfig.bind(this);
    this.requestStream = this.requestStream.bind(this);
    this.getStream = this.getStream.bind(this);
    this.releaseStream = this.releaseStream.bind(this);
    this.config = config || { video: true, audio: true };
    this.stream = null;
  }

  changeConfig(config) {
    this.config = config;
    this.releaseStream();
    return this.requestStream();
  }

  requestStream() {
    return navigator.mediaDevices.getUserMedia(
      this.config
    ).then(
      stream => {
        this.stream = stream;
        return this.emit('stream_ready', stream);
    }).catch(
      error => {
        return this.emit('stream_error', error);
    });
  }

  getStream() {
    return this.stream;
  }

  releaseStream() {
    if (this.stream) {
      this.stream.getAudioTracks().forEach( track => track.stop() );
      this.stream.getVideoTracks().forEach( track => track.stop() );
      this.stream = null;
      this.emit('stream_released', this);
      return true;
    } else {
      return false;
    }
  }
};
export default defaultExport;
