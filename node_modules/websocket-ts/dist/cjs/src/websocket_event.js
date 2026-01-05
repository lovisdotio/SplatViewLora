"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsocketEvent = void 0;
/**
 * Events that can be fired by the websocket.
 */
var WebsocketEvent;
(function (WebsocketEvent) {
    /** Fired when the connection is opened. */
    WebsocketEvent["open"] = "open";
    /** Fired when the connection is closed. */
    WebsocketEvent["close"] = "close";
    /** Fired when the connection has been closed because of an error, such as when some data couldn't be sent. */
    WebsocketEvent["error"] = "error";
    /** Fired when a message is received. */
    WebsocketEvent["message"] = "message";
    /** Fired when the websocket tries to reconnect after a connection loss. */
    WebsocketEvent["retry"] = "retry";
    /** Fired when the websocket successfully reconnects after a connection loss. */
    WebsocketEvent["reconnect"] = "reconnect";
})(WebsocketEvent || (exports.WebsocketEvent = WebsocketEvent = {}));
//# sourceMappingURL=websocket_event.js.map