import { Backoff } from "./backoff/backoff";
import { WebsocketEvent, WebsocketEventListener, WebsocketEventListenerOptions } from "./websocket_event";
import { Websocket } from "./websocket";
import { WebsocketBuffer } from "./websocket_buffer";
/**
 * Builder for websockets.
 */
export declare class WebsocketBuilder {
    private readonly _url;
    private _protocols?;
    private _options?;
    /**
     * Creates a new WebsocketBuilder.
     *
     * @param url the url to connect to
     */
    constructor(url: string);
    /**
     * Getter for the url.
     *
     * @returns the url
     */
    get url(): string;
    /**
     * Adds protocols to the websocket. Subsequent calls to this method will override the previously set protocols.
     *
     * @param protocols the protocols to add
     */
    withProtocols(protocols: string | string[] | undefined): WebsocketBuilder;
    /**
     * Getter for the protocols.
     *
     * @returns the protocols, undefined if no protocols have been set
     */
    get protocols(): string | string[] | undefined;
    /**
     * Sets the maximum number of retries before giving up. No limit if undefined.
     *
     * @param maxRetries the maximum number of retries before giving up
     */
    withMaxRetries(maxRetries: number | undefined): WebsocketBuilder;
    /**
     * Getter for the maximum number of retries before giving up.
     *
     * @returns the maximum number of retries before giving up, undefined if no maximum has been set
     */
    get maxRetries(): number | undefined;
    /**
     * Sets wether to reconnect immediately after a connection has been lost, ignoring the backoff strategy for the first retry.
     *
     * @param instantReconnect wether to reconnect immediately after a connection has been lost
     */
    withInstantReconnect(instantReconnect: boolean | undefined): WebsocketBuilder;
    /**
     * Getter for wether to reconnect immediately after a connection has been lost, ignoring the backoff strategy for the first retry.
     *
     * @returns wether to reconnect immediately after a connection has been lost, undefined if no value has been set
     */
    get instantReconnect(): boolean | undefined;
    /**
     * Adds a backoff to the websocket. Subsequent calls to this method will override the previously set backoff.
     *
     * @param backoff the backoff to add
     */
    withBackoff(backoff: Backoff | undefined): WebsocketBuilder;
    /**
     * Getter for the backoff.
     *
     * @returns the backoff, undefined if no backoff has been set
     */
    get backoff(): Backoff | undefined;
    /**
     * Adds a buffer to the websocket. Subsequent calls to this method will override the previously set buffer.
     *
     * @param buffer the buffer to add
     */
    withBuffer(buffer: WebsocketBuffer | undefined): WebsocketBuilder;
    /**
     * Getter for the buffer.
     *
     * @returns the buffer, undefined if no buffer has been set
     */
    get buffer(): WebsocketBuffer | undefined;
    /**
     * Adds an 'open' event listener to the websocket. Subsequent calls to this method will add additional listeners that will be
     * called in the order they were added.
     *
     * @param listener the listener to add
     * @param options the listener options
     */
    onOpen(listener: WebsocketEventListener<WebsocketEvent.open>, options?: WebsocketEventListenerOptions): WebsocketBuilder;
    /**
     * Adds an 'close' event listener to the websocket. Subsequent calls to this method will add additional listeners that will be
     * called in the order they were added.
     *
     * @param listener the listener to add
     * @param options the listener options
     */
    onClose(listener: WebsocketEventListener<WebsocketEvent.close>, options?: WebsocketEventListenerOptions): WebsocketBuilder;
    /**
     * Adds an 'error' event listener to the websocket. Subsequent calls to this method will add additional listeners that will be
     * called in the order they were added.
     *
     * @param listener the listener to add
     * @param options the listener options
     */
    onError(listener: WebsocketEventListener<WebsocketEvent.error>, options?: WebsocketEventListenerOptions): WebsocketBuilder;
    /**
     * Adds an 'message' event listener to the websocket. Subsequent calls to this method will add additional listeners that will be
     * called in the order they were added.
     *
     * @param listener the listener to add
     * @param options the listener options
     */
    onMessage(listener: WebsocketEventListener<WebsocketEvent.message>, options?: WebsocketEventListenerOptions): WebsocketBuilder;
    /**
     * Adds an 'retry' event listener to the websocket. Subsequent calls to this method will add additional listeners that will be
     * called in the order they were added.
     *
     * @param listener the listener to add
     * @param options the listener options
     */
    onRetry(listener: WebsocketEventListener<WebsocketEvent.retry>, options?: WebsocketEventListenerOptions): WebsocketBuilder;
    /**
     * Adds an 'reconnect' event listener to the websocket. Subsequent calls to this method will add additional listeners that will be
     * called in the order they were added.
     *
     * @param listener the listener to add
     * @param options the listener options
     */
    onReconnect(listener: WebsocketEventListener<WebsocketEvent.reconnect>, options?: WebsocketEventListenerOptions): WebsocketBuilder;
    /**
     * Builds the websocket.
     *
     * @return a new websocket, with the set options
     */
    build(): Websocket;
    /**
     * Adds an event listener to the options.
     *
     * @param event the event to add the listener to
     * @param listener the listener to add
     * @param options the listener options
     */
    private addListener;
}
//# sourceMappingURL=websocket_builder.d.ts.map