const defaultExport = {};
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS208: Avoid top-level this
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const {
  palava
} = defaultExport;

const Cls = (palava.DataChannel = class DataChannel extends defaultExport.EventEmitter {
  static initClass() {
  
    this.prototype.MAX_BUFFER = 1024 * 1024;
  }

  constructor(channel) {
    super();

    this.channel = channel;
    this.channel.onmessage = event => this.emit('message', event.data);
    this.channel.onclose = () => this.emit('close');
    this.channel.onerror = e => this.emit('error', e);
    this.sendBuffer = [];
  }

  send(data, cb) {
    this.sendBuffer.push([data, cb]);

    if (this.sendBuffer.length === 1) {
      return this.actualSend();
    }
  }

  actualSend() {
    if (this.channel.readyState !== 'open') {
      console.log("Not sending when not open!");
      return;
    }

    while (this.sendBuffer.length) {
      var e;
      if (this.channel.bufferedAmount > this.MAX_BUFFER) {
        setTimeout(this.actualSend.bind(this), 1);
        return;
      }

      const [data, cb] = Array.from(this.sendBuffer[0]);

      try {
        this.channel.send(data);
      } catch (error) {
        e = error;
        setTimeout(this.actualSend.bind(this), 1);
        return;
      }

      try {
        if (typeof cb === 'function') {
          cb();
        }
      } catch (error1) {
        // TODO: find a better way to tell the user ...
        e = error1;
        console.log('Exception in write callback:', e);
      }

      this.sendBuffer.shift();
    }
  }
});
export default defaultExport;
Cls.initClass();

