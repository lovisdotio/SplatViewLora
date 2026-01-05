/**
 * ConstantBackoff always returns the same backoff-time.
 */
export class ConstantBackoff {
    /**
     * Creates a new ConstantBackoff.
     * @param backoff the backoff-time to return
     */
    constructor(backoff) {
        this._retries = 0;
        if (!Number.isInteger(backoff) || backoff < 0) {
            throw new Error("Backoff must be a positive integer");
        }
        this.backoff = backoff;
    }
    get retries() {
        return this._retries;
    }
    get current() {
        return this.backoff;
    }
    next() {
        this._retries++;
        return this.backoff;
    }
    reset() {
        this._retries = 0;
    }
}
//# sourceMappingURL=constantbackoff.js.map