import { Backoff } from "./backoff";
/**
 * LinearBackoff returns a backoff-time that is incremented by a fixed amount
 * with every step/retry. An optional maximum can be provided as an upper bound
 * to the returned backoff.
 *
 * The series can be described as ('i' is the current step/retry):
 *   backoff = initial + increment * i                | without bound
 *   backoff = initial + increment * min(i, max)      | with bound
 *
 * Example:
 *
 * 1) Without bound:
 *  initial = 1000, increment = 1000
 *  backoff = 1000 + 1000 * 0 = 1000 // first retry
 *  backoff = 1000 + 1000 * 1 = 2000 // second retry
 *  backoff = 1000 + 1000 * 2 = 3000 // ...increases by 'increment' with every retry
 *  backoff = 1000 + 1000 * 3 = 4000
 *  backoff = 1000 + 1000 * 4 = 5000
 *  ... // and so on
 *
 *  2) With bound:
 *  initial = 1000, increment = 1000, max = 5000
 *  backoff = 1000 + 1000 * 0 = 1000 // first retry
 *  backoff = 1000 + 1000 * 1 = 2000 // second retry
 *  backoff = 1000 + 1000 * 2 = 3000 // third retry
 *  backoff = 1000 + 1000 * 3 = 4000 // fourth retry
 *  backoff = 1000 + 1000 * 4 = 5000 // maximum reached, don't increase further
 *  backoff = 1000 + 1000 * 4 = 5000
 *  backoff = 1000 + 1000 * 4 = 5000
 *  ... // and so on
 */
export declare class LinearBackoff implements Backoff {
    private readonly initial;
    private readonly increment;
    private readonly max?;
    private i;
    private _retries;
    /**
     * Creates a new LinearBackoff.
     * @param initial the initial backoff-time in milliseconds
     * @param increment the amount to increment the backoff-time with every step (in milliseconds)
     * @param max the maximum backoff-time (in milliseconds), no bound if undefined
     */
    constructor(initial: number, increment: number, max?: number);
    get retries(): number;
    get current(): number;
    next(): number;
    reset(): void;
}
//# sourceMappingURL=linearbackoff.d.ts.map