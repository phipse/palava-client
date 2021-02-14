const defaultExport = {};
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * DS208: Avoid top-level this
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const {
  palava
} = defaultExport;

// Channel implementation using websockets
//
// Events: open -> (), message -> (msg), error -> (), close -> ()
//
palava.WebSocketChannel = class WebSocketChannel extends defaultExport.EventEmitter {

  // @param address [String] Address of the websocket. Should start with `ws://` for web sockets or `wss://` for secure web sockets.
  constructor(address, retries) {
    super();

    this.isConnected = this.isConnected.bind(this);
    this.sendDeliverOnConnectMessages = this.sendDeliverOnConnectMessages.bind(this);
    this.setupWebsocket = this.setupWebsocket.bind(this);
    this.startClientPings = this.startClientPings.bind(this);
    this.send = this.send.bind(this);
    this.close = this.close.bind(this);
    if (retries == null) { retries = 2; }
    this.address = address;
    this.retries = retries;
    this.messagesToDeliverOnConnect = [];
    this.setupWebsocket();
    this.startClientPings();
  }

  // Returns true if socket is in a good state
  isConnected() {
    return (this.socket != null ? this.socket.readyState : undefined) === 1;
  }

  sendDeliverOnConnectMessages() {
    for (let msg of Array.from(this.messagesToDeliverOnConnect)) {
      this.socket.send(msg);
    }
    return this.messagesToDeliverOnConnect = [];
  }

  // Connects websocket events with the events of this object
  //
  // @nodoc
  //
  setupWebsocket() {
    this.socket = new WebSocket(this.address);
    this.socket.onopen = handshake => {
      this.retries = 0;
      this.sendDeliverOnConnectMessages();
      return this.emit('open', handshake);
    };
    this.socket.onmessage = msg => {
      try {
        const parsedMsg = JSON.parse(msg.data);
        if (parsedMsg.event === "pong") {
          return this.outstandingPongs = 0;
        } else {
          return this.emit('message', parsedMsg);
        }
      } catch (error) {
        return this.emit('error', 'invalid_format', {
          error,
          data: msg.data
        }
        );
      }
    };

    this.socket.onerror = msg => {
      clearInterval(this.pingInterval);
      if (this.retries > 0) {
        this.retries -= 1;
        this.setupWebsocket();
        return this.startClientPings();
      } else {
        return this.emit('error', 'socket', msg);
      }
    };
    return this.socket.onclose = () => {
      clearInterval(this.pingInterval);
      return this.emit('close');
    };
  }

  startClientPings() {
    this.outstandingPongs = 0;
    return this.pingInterval = setInterval( () => {
      if (this.outstandingPongs >= 6) {
        clearInterval(this.pingInterval);
        this.socket.close();
        this.emit('error', "missing_pongs");
      }

      this.socket.send(JSON.stringify({event: "ping"}));
      return this.outstandingPongs += 1;
    }
    , 5000);
  }

  // Sends the given data through the websocket
  //
  // @param data [Object] Object to send through the channel
  //
  send(data) {
    if (this.socket.readyState === 1) { // successful connection
      if (this.messagesToDeliverOnConnect.length !== 0) {
        this.sendDeliverOnConnectMessages();
      }
      return this.socket.send(JSON.stringify(data));
    } else if (this.socket.readyState > 1) { // connection closing or closed
      return this.emit('not_reachable');
    } else { // connection still to be established
      return this.messagesToDeliverOnConnect.push(JSON.stringify(data));
    }
  }

  // Closes the websocket
  //
  close() {
    return this.socket.close();
  }
};
export default defaultExport;
