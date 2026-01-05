import { Queue } from "./queue";
/**
 * A ring queue is a queue that has a fixed capacity. When the queue is full, the oldest element is
 * removed to make room for the new element. Reading from a ring queue will return the oldest
 * element and effectively remove it from the queue.
 */
export declare class RingQueue<E> implements Queue<E> {
    private readonly elements;
    private head;
    private tail;
    constructor(capacity: number);
    add(element: E): void;
    clear(): void;
    forEach(fn: (element: E) => unknown): void;
    length(): number;
    isEmpty(): boolean;
    peek(): E | undefined;
    read(): E | undefined;
}
//# sourceMappingURL=ring_queue.d.ts.map