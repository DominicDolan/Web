import {isEqual} from "@web/utils"
import {Model} from "../models/Model";
import {ModelDelta} from "../models/ModelDelta";

/**
 * Calculates the difference between two model instances and returns a delta object
 * containing only the changed fields.
 *
 * @template M - The model type extending the base Model interface
 * @param before - The original model state
 * @param after - The updated model state
 * @returns A ModelDelta containing changed fields, or null if no changes detected
 * @throws {Error} When comparing models with different IDs
 *
 * @example
 * ```typescript
 * const userBefore = { id: '1', updatedAt: new Date(), name: 'John', age: 30 };
 * const userAfter = { id: '1', updatedAt: new Date(), name: 'Jane', age: 30 };
 * const delta = calculateDelta(userBefore, userAfter);
 * // Returns: { modelId: '1', timestamp: Date, name: 'Jane' }
 * ```
 */
export function calculateDelta<M extends Model>(before: M, after: M): ModelDelta<M> | null {
    // Ensure we're comparing the same model
    if (before.id !== after.id) {
        throw new Error('Cannot calculate delta between different models');
    }

    const changes: Partial<Omit<M, 'id' | 'updatedAt'>> = {};
    let hasChanges = false;

    // Get all keys from both models, excluding 'id' and 'updatedAt'
    const beforeKeys = Object.keys(before).filter(
        key => key !== 'id' && key !== 'updatedAt'
    );
    const afterKeys = Object.keys(after).filter(
        key => key !== 'id' && key !== 'updatedAt'
    );

    // Combine all keys from both objects to ensure we check removed fields
    const allKeys = new Set([...beforeKeys, ...afterKeys]);
    const keysToCompare = Array.from(allKeys) as Array<keyof Omit<M, 'id' | 'updatedAt'>>;

    // Compare each field
    for (const key of keysToCompare) {
        const beforeValue = before[key];
        const afterValue = after[key];

        // Deep comparison for objects, shallow for primitives
        if (!isEqual(beforeValue, afterValue)) {
            changes[key] = afterValue;
            hasChanges = true;
        }
    }

    // Return null if no changes detected
    if (!hasChanges) {
        return null;
    }

    // Return the delta with required fields and changes
    return {
        modelId: after.id,
        timestamp: Date.now(),
        type: "update",
        payload: changes
    } as ModelDelta<M>;
}
