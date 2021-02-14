const defaultExport = {};
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS208: Avoid top-level this
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const {
  palava
} = defaultExport;
const {
  adapter
} = defaultExport;

export default defaultExport;

// Checks whether the browser is a Firefox
//
// @return [Boolean] `true` if Firefox
//
palava.browser.isMozilla = () => adapter.browserDetails.browser === 'firefox';

// Checks whether the browser is a Chrome/Chromium
//
// @return [Boolean] `true` if Chrome
//
palava.browser.isChrome = () => adapter.browserDetails.browser === 'chrome';

// Checks which browser is used
//
// @return [String] A well defined id of the browser (firefox, chrome, safari, or unknown)
//
palava.browser.getUserAgent = () => adapter.browserDetails.browser;

// Checks which browser is used
//
// @return [Integer] The user agent version
//
palava.browser.getUserAgentVersion = () => adapter.browserDetails.version;

// Checks whether the WebRTC support of the browser should be compatible with palava
//
// Please note: The test requires network connectivity
//
// @return [Boolean] `true` if the browser is supported by palava
//
palava.browser.checkForWebrtcError = function() {
  try {
    new window.RTCPeerConnection({iceServers: []});
  } catch (e) {
    return e;
  }

  return !( window.RTCPeerConnection && window.RTCIceCandidate && window.RTCSessionDescription && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
};

// Get WebRTC constraints argument
//
// @return [Object] Appropriate constraints for WebRTC
//
palava.browser.getConstraints = function() {
  const constraints = {
    optional: [],
    mandatory: {
      OfferToReceiveAudio: true,
      OfferToReceiveVideo: true
    }
  };
  return constraints;
};

// Get WebRTC PeerConnection options
//
// @return [Object] Appropriate options for the PeerConnection
//
palava.browser.getPeerConnectionOptions = function() {
  if (palava.browser.isChrome()) {
    return {"optional": [{"DtlsSrtpKeyAgreement": true}]};
  } else {
    return {};
  }
};

//# DOM

// Activates fullscreen on the given event
//
// @param element [DOM Elements] Element to put into fullscreen
// @param eventName [String] Event name on which to activate fullscreen
//
palava.browser.registerFullscreen = function(element, eventName) {
  console.log("DEPRECATED: palava.browser.registerFullscreen will be removed from the palava library in early 2021");
  if(element.requestFullscreen) {
    return element.addEventListener(eventName, function() { return this.requestFullscreen(); });
  } else if(element.mozRequestFullScreen) {
    return element.addEventListener(eventName, function() { return this.mozRequestFullScreen(); });
  } else if(element.webkitRequestFullscreen) {
    return element.addEventListener(eventName, function() { return this.webkitRequestFullscreen(); });
  }
};

palava.browser.attachMediaStream = function(element, stream) {
  if (stream) {
    return element.srcObject = stream;
  } else {
    element.pause();
    return element.srcObject = null;
  }
};

palava.browser.attachPeer = function(element, peer) {
  const attach = function() {
    palava.browser.attachMediaStream(element, peer.getStream());

    if (peer.isLocal()) {
      element.setAttribute('muted', true);
    }

    return element.play();
  };

  if (peer.getStream()) {
    return attach();
  } else {
    return peer.on('stream_ready', () => attach());
  }
};
