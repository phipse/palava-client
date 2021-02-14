import * as license from"./license";
import * as module from"./module";
import * as browser from "./browser";
import * as identity from"./identity";
import * as room from"./room";
import * as session from"./session";

// initialize palava object
palava =
  {
    browser: browser,
    license: license,
    module: module,
    identity: identity,
    room: room,
    session: session
  } 

palava.PROTOCOL_NAME = 'palava'
palava.PROTOCOL_VERSION = '1.0.0'

export default palava
