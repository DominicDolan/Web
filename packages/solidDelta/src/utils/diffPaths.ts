// diffPaths.ts

function isPlainObject(value: any): value is Record<string, any> {
    return value !== null && typeof value === 'object' && value.constructor === Object;
}

export interface DiffResult {
    path: string[];
    value: any;
}

export function diffPaths(left: any, right: any, currentPath: string[] = []): DiffResult[] {
    // If they are exactly the same value, there is no difference
    if (Object.is(left, right)) {
        return [];
    }

    // If either side is not a plain object, we've hit a leaf node (or root primitive)
    if (!isPlainObject(left) || !isPlainObject(right)) {
        return [{ path: currentPath, value: right }];
    }

    const paths: DiffResult[] = [];
    const allKeys = new Set([...Object.keys(left), ...Object.keys(right)]);

    for (const key of allKeys) {
        const nextPath = [...currentPath, key];

        if (!(key in right)) {
            // Exists in left, absent in right
            paths.push({ path: nextPath, value: undefined });
        } else if (!(key in left)) {
            // Exists in right, absent in left
            paths.push({ path: nextPath, value: right[key] });
        } else {
            // Exists in both, so we compare them
            const leftVal = left[key];
            const rightVal = right[key];

            if (isPlainObject(leftVal) && isPlainObject(rightVal)) {
                // Recursively diff nested plain objects, merging the resulting path arrays
                paths.push(...diffPaths(leftVal, rightVal, nextPath));
            } else if (!Object.is(leftVal, rightVal)) {
                // For primitives, arrays, and other objects, record the diff
                paths.push({ path: nextPath, value: rightVal });
            }
        }
    }

    return paths;
}
