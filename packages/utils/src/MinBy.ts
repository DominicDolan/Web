/**
 * Returns the item with the smallest computed value from an array.
 *
 * @template T - The item type in the array.
 * @param items - The array to evaluate.
 * @param iteratee - A function that computes a comparable numeric value for each item.
 * @returns The item with the minimum computed value, or `undefined` when `items` is empty.
 */
export function minBy<T>(items: readonly T[], iteratee: (item: T, index: number) => number): T | undefined {
    if (items.length === 0) {
        return undefined;
    }

    let minItems = items[0];
    let minValue = iteratee(minItems, 0);

    for (let index = 1; index < items.length; index++) {
        const item = items[index];
        const value = iteratee(item, index);

        if (value < minValue) {
            minItems = item;
            minValue = value;
        }
    }

    return minItems;
}
