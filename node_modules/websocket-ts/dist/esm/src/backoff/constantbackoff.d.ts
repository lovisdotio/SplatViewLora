import { Backoff } from "./backoff";
/**
 * ConstantBackoff always returns the same backoff-time.
 */
export declare class ConstantBackoff implements Backoff {
    private readonly backoff;
    private _retries;
    /**
     * Creates a new ConstantBackoff.
     * @param backoff the backoff-time to return
     */
    constructor(backoff: number);
    get retries(): number;
    get current(): number;
    next(): number;
    reset(): void;
}
//# sourceMappingURL=constantbackoff.d.ts.map