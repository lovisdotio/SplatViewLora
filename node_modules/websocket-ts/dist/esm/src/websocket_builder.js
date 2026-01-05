import { WebsocketEvent, } from "./websocket_event";
import { Websocket } from "./websocket";
/**
 * Builder for websockets.
 */
export class WebsocketBuilder {
    /**
     * Creates a new WebsocketBuilder.
     *
     * @param url the url to connect to
     */
    constructor(url) {
        this._url = url;
    }
    /**
     * Getter for the url.
     *
     * @returns the url
     */
    get url() {
        return this._url;
    }
    /**
     * Adds protocols to the websocket. Subsequent calls to this method will override the previously set protocols.
     *
     * @param protocols the protocols to add
     */
    withProtocols(protocols) {
        this._protocols = protocols;
        return this;
    }
    /**
     * Getter for the protocols.
     *
     * @returns the protocols, undefined if no protocols have been set
     */
    get protocols() {
        return this._protocols;
    }
    /**
     * Sets the maximum number of retries before giving up. No limit if undefined.
     *
     * @param maxRetries the maximum number of retries before giving up
     */
    withMaxRetries(maxRetries) {
        var _a;
        this._options = Object.assign(Object.assign({}, this._options), { retry: Object.assign(Object.assign({}, (_a = this._options) === null || _a === void 0 ? void 0 : _a.retry), { maxRetries }) });
        return this;
    }
    /**
     * Getter for the maximum number of retries before giving up.
     *
     * @returns the maximum number of retries before giving up, undefined if no maximum has been set
     */
    get maxRetries() {
        var _a, _b;
        return (_b = (_a = this._options) === null || _a === void 0 ? void 0 : _a.retry) === null || _b === void 0 ? void 0 : _b.maxRetries;
    }
    /**
     * Sets wether to reconnect immediately after a connection has been lost, ignoring the backoff strategy for the first retry.
     *
     * @param instantReconnect wether to reconnect immediately after a connection has been lost
     */
    withInstantReconnect(instantReconnect) {
        var _a;
        this._options = Object.assign(Object.assign({}, this._options), { retry: Object.assign(Object.assign({}, (_a = this._options) === null || _a === void 0 ? void 0 : _a.retry), { instantReconnect }) });
        return this;
    }
    /**
     * Getter for wether to reconnect immediately after a connection has been lost, ignoring the backoff strategy for the first retry.
     *
     * @returns wether to reconnect immediately after a connection has been lost, undefined if no value has been set
     */
    get instantReconnect() {
        var _a, _b;
        return (_b = (_a = this._options) === null || _a === void 0 ? void 0 : _a.retry) === null || _b === void 0 ? void 0 : _b.instantReconnect;
    }
    /**
     * Adds a backoff to the websocket. Subsequent calls to this method will override the previously set backoff.
     *
     * @param backoff the backoff to add
     */
    withBackoff(backoff) {
        var _a;
        this._options = Object.assign(Object.assign({}, this._options), { retry: Object.assign(Object.assign({}, (_a = this._options) === null || _a === void 0 ? void 0 : _a.retry), { backoff }) });
        return this;
    }
    /**
     * Getter for the backoff.
     *
     * @returns the backoff, undefined if no backoff has been set
     */
    get backoff() {
        var _a, _b;
        return (_b = (_a = this._options) === null || _a === void 0 ? void 0 : _a.retry) === null || _b === void 0 ? void 0 : _b.backoff;
    }
    /**
     * Adds a buffer to the websocket. Subsequent calls to this method will override the previously set buffer.
     *
     * @param buffer the buffer to add
     */
    withBuffer(buffer) {
        this._options = Object.assign(Object.assign({}, this._options), { buffer });
        return this;
    }
    /**
     * Getter for the buffer.
     *
     * @returns the buffer, undefined if no buffer has been set
     */
    get buffer() {
        var _a;
        return (_a = this._options) === null || _a === void 0 ? void 0 : _a.buffer;
    }
    /**
     * Adds an 'open' event listener to the websocket. Subsequent calls to this method will add additional listeners that will be
     * called in the order they were added.
     *
     * @param listener the listener to add
     * @param options the listener options
     */
    onOpen(listener, options) {
        this.addListener(WebsocketEvent.open, listener, options);
        return this;
    }
    /**
     * Adds an 'close' event listener to the websocket. Subsequent calls to this method will add additional listeners that will be
     * called in the order they were added.
     *
     * @param listener the listener to add
     * @param options the listener options
     */
    onClose(listener, options) {
        this.addListener(WebsocketEvent.close, listener, options);
        return this;
    }
    /**
     * Adds an 'error' event listener to the websocket. Subsequent calls to this method will add additional listeners that will be
     * called in the order they were added.
     *
     * @param listener the listener to add
     * @param options the listener options
     */
    onError(listener, options) {
        this.addListener(WebsocketEvent.error, listener, options);
        return this;
    }
    /**
     * Adds an 'message' event listener to the websocket. Subsequent calls to this method will add additional listeners that will be
     * called in the order they were added.
     *
     * @param listener the listener to add
     * @param options the listener options
     */
    onMessage(listener, options) {
        this.addListener(WebsocketEvent.message, listener, options);
        return this;
    }
    /**
     * Adds an 'retry' event listener to the websocket. Subsequent calls to this method will add additional listeners that will be
     * called in the order they were added.
     *
     * @param listener the listener to add
     * @param options the listener options
     */
    onRetry(listener, options) {
        this.addListener(WebsocketEvent.retry, listener, options);
        return this;
    }
    /**
     * Adds an 'reconnect' event listener to the websocket. Subsequent calls to this method will add additional listeners that will be
     * called in the order they were added.
     *
     * @param listener the listener to add
     * @param options the listener options
     */
    onReconnect(listener, options) {
        this.addListener(WebsocketEvent.reconnect, listener, options);
        return this;
    }
    /**
     * Builds the websocket.
     *
     * @return a new websocket, with the set options
     */
    build() {
        return new Websocket(this._url, this._protocols, this._options); // instantiate the websocket with the set options
    }
    /**
     * Adds an event listener to the options.
     *
     * @param event the event to add the listener to
     * @param listener the listener to add
     * @param options the listener options
     */
    addListener(event, listener, options) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
        this._options = Object.assign(Object.assign({}, this._options), { listeners: {
                open: (_c = (_b = (_a = this._options) === null || _a === void 0 ? void 0 : _a.listeners) === null || _b === void 0 ? void 0 : _b.open) !== null && _c !== void 0 ? _c : [],
                close: (_f = (_e = (_d = this._options) === null || _d === void 0 ? void 0 : _d.listeners) === null || _e === void 0 ? void 0 : _e.close) !== null && _f !== void 0 ? _f : [],
                error: (_j = (_h = (_g = this._options) === null || _g === void 0 ? void 0 : _g.listeners) === null || _h === void 0 ? void 0 : _h.error) !== null && _j !== void 0 ? _j : [],
                message: (_m = (_l = (_k = this._options) === null || _k === void 0 ? void 0 : _k.listeners) === null || _l === void 0 ? void 0 : _l.message) !== null && _m !== void 0 ? _m : [],
                retry: (_q = (_p = (_o = this._options) === null || _o === void 0 ? void 0 : _o.listeners) === null || _p === void 0 ? void 0 : _p.retry) !== null && _q !== void 0 ? _q : [],
                reconnect: (_t = (_s = (_r = this._options) === null || _r === void 0 ? void 0 : _r.listeners) === null || _s === void 0 ? void 0 : _s.reconnect) !== null && _t !== void 0 ? _t : [],
                [event]: [
                    ...((_w = (_v = (_u = this._options) === null || _u === void 0 ? void 0 : _u.listeners) === null || _v === void 0 ? void 0 : _v[event]) !== null && _w !== void 0 ? _w : []),
                    { listener, options },
                ],
            } });
        return this;
    }
}
//# sourceMappingURL=websocket_builder.js.map