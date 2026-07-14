
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

    // If either side is not a plain object at the root, we've hit a leaf node
    if (!isPlainObject(left) || !isPlainObject(right)) {
        return [{ path: currentPath, value: right }];
    }

    const paths: DiffResult[] = [];
    const allKeys = new Set([...Object.keys(left), ...Object.keys(right)]);

    for (const key of allKeys) {
        const nextPath = [...currentPath, key];

        if (!(key in right)) {
            // Exists in left, absent in right (Deletion)
            paths.push({ path: nextPath, value: undefined });
        } else {
            const leftVal = left[key];
            const rightVal = right[key];

            // If the right value is a plain object, we ALWAYS want deep leaf paths.
            if (isPlainObject(rightVal)) {
                // If leftVal isn't a plain object (e.g., it's missing, or it's a primitive),
                // we diff against an empty object so all nested keys are treated as additions.
                const leftCompare = isPlainObject(leftVal) ? leftVal : {};
                paths.push(...diffPaths(leftCompare, rightVal, nextPath));
            } else if (!Object.is(leftVal, rightVal)) {
                // For primitives, arrays, etc., just record the diff
                paths.push({ path: nextPath, value: rightVal });
            }
        }
    }

    return paths;
}
