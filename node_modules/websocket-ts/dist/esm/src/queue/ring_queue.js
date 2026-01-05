/**
 * A ring queue is a queue that has a fixed capacity. When the queue is full, the oldest element is
 * removed to make room for the new element. Reading from a ring queue will return the oldest
 * element and effectively remove it from the queue.
 */
export class RingQueue {
    constructor(capacity) {
        if (!Number.isInteger(capacity) || capacity <= 0) {
            throw new Error("Capacity must be a positive integer");
        }
        this.elements = new Array(capacity + 1); // +1 to distinguish between full and empty
        this.head = 0;
        this.tail = 0;
    }
    add(element) {
        this.elements[this.head] = element;
        this.head = (this.head + 1) % this.elements.length;
        if (this.head === this.tail) {
            this.tail = (this.tail + 1) % this.elements.length;
        }
    }
    clear() {
        this.head = 0;
        this.tail = 0;
    }
    forEach(fn) {
        for (let i = this.tail; i !== this.head; i = (i + 1) % this.elements.length) {
            fn(this.elements[i]);
        }
    }
    length() {
        return this.tail === this.head
            ? 0
            : this.tail < this.head
                ? this.head - this.tail
                : this.elements.length - this.tail + this.head;
    }
    isEmpty() {
        return this.head === this.tail;
    }
    peek() {
        return this.isEmpty() ? undefined : this.elements[this.tail];
    }
    read() {
        const e = this.peek();
        if (e !== undefined) {
            this.tail = (this.tail + 1) % this.elements.length;
        }
        return e;
    }
}
//# sourceMappingURL=ring_queue.js.map