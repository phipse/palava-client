/*
 * decaffeinate suggestions:
 * DS208: Avoid top-level this
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// export if module (CommonJS)
if ((typeof module === "object") && (typeof module.exports === "object")) {
  module.exports = this.palava;
}

if ((typeof EventEmitter !== "object") && (typeof require === "function")) {
  this.EventEmitter = require('wolfy87-eventemitter');
} else {
  this.EventEmitter = EventEmitter;
}

if ((typeof adapter !== "object") && (typeof require === "function")) {
  this.adapter = require('webrtc-adapter/out/adapter_no_edge');
} else {
  this.adapter = adapter;
}
