const defaultExport = {};
/*
 * decaffeinate suggestions:
 * DS208: Avoid top-level this
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// export if module (CommonJS)
if ((typeof module === "object") && (typeof defaultExport === "object")) {
  defaultExport = defaultExport.palava;
}

if ((typeof EventEmitter !== "object") && (typeof require === "function")) {
  defaultExport.EventEmitter = require('wolfy87-eventemitter');
} else {
  defaultExport.EventEmitter = EventEmitter;
}

if ((typeof adapter !== "object") && (typeof require === "function")) {
  defaultExport.adapter = require('webrtc-adapter/out/adapter_no_edge');
} else {
  defaultExport.adapter = adapter;
}
export default defaultExport;
