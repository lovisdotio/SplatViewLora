import { Backoff } from "./backoff";
/**
 * ExponentialBackoff increases the backoff-time exponentially.
 * An optional maximum can be provided as an upper bound to the
 * exponent and thus to the returned backoff.
 *
 * The series can be described as ('i' is the current step/retry):
 *    backoff = base * 2^i                | without bound
 *    backoff = base * 2^min(i, expMax)   | with bound
 *
 * Example:
 *
 * 1) Without bound:
 *   base = 1000, expMax = undefined
 *   backoff = 1000 * 2^0 = 1000 // first retry
 *   backoff = 1000 * 2^1 = 2000 // second retry
 *   backoff = 1000 * 2^2 = 4000 // ...doubles with every retry
 *   backoff = 1000 * 2^3 = 8000
 *   backoff = 1000 * 2^4 = 16000
 *   ... // and so on
 *
 * 2) With bound:
 *  base = 1000, expMax = 3
 *  backoff = 1000 * 2^0 = 1000 // first retry
 *  backoff = 1000 * 2^1 = 2000 // second retry
 *  backoff = 1000 * 2^2 = 4000 // third retry
 *  backoff = 1000 * 2^3 = 8000 // maximum reached, don't increase further
 *  backoff = 1000 * 2^3 = 8000
 *  backoff = 1000 * 2^3 = 8000
 *  ... // and so on
 */
export declare class ExponentialBackoff implements Backoff {
    private readonly base;
    private readonly expMax?;
    private i;
    private _retries;
    /**
     * Creates a new ExponentialBackoff.
     * @param base the base of the exponentiation
     * @param expMax the maximum exponent, no bound if undefined
     */
    constructor(base: number, expMax?: number);
    get retries(): number;
    get current(): number;
    next(): number;
    reset(): void;
}
//# sourceMappingURL=exponentialbackoff.d.ts.map