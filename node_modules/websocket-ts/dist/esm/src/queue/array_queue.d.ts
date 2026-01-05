import { Queue } from "./queue";
/**
 * An array queue is a queue that has an unbounded capacity. Reading from an array queue
 * will return the oldest element and effectively remove it from the queue.
 */
export declare class ArrayQueue<E> implements Queue<E> {
    private readonly elements;
    constructor();
    add(element: E): void;
    clear(): void;
    forEach(fn: (element: E) => unknown): void;
    length(): number;
    isEmpty(): boolean;
    peek(): E | undefined;
    read(): E | undefined;
}
//# sourceMappingURL=array_queue.d.ts.map