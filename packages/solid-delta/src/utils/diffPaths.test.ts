// diffPaths.test.ts
import { describe, it, expect } from 'vitest';
import { diffPaths } from './diffPaths';

describe('diffPaths function', () => {
    it('should return an empty array if there are no differences', () => {
        const obj = { a: 1, b: 'test' };
        expect(diffPaths(obj, { ...obj })).toEqual([]);
    });

    it('should return paths for updated primitive values', () => {
        const left = { a: 1, b: 2 };
        const right = { a: 1, b: 3 };
        expect(diffPaths(left, right)).toEqual([
            { path: ['b'], value: 3 }
        ]);
    });

    it('should return paths for newly added properties', () => {
        const left = { a: 1 };
        const right = { a: 1, b: 2 };
        expect(diffPaths(left, right)).toEqual([
            { path: ['b'], value: 2 }
        ]);
    });

    it('should mark removed properties as undefined', () => {
        const left = { a: 1, b: 2 };
        const right = { a: 1 };
        expect(diffPaths(left, right)).toEqual([
            { path: ['b'], value: undefined }
        ]);
    });

    describe('nested objects', () => {
        it('should deep diff nested objects and build full paths', () => {
            const left = { user: { name: 'John', age: 25 } };
            const right = { user: { name: 'Jane', age: 25 } };
            expect(diffPaths(left, right)).toEqual([
                { path: ['user', 'name'], value: 'Jane' }
            ]);
        });

        it('should return undefined for removed nested properties', () => {
            const left = { config: { retries: 3, timeout: 1000 } };
            const right = { config: { timeout: 1000 } };
            expect(diffPaths(left, right)).toEqual([
                { path: ['config', 'retries'], value: undefined }
            ]);
        });

        it('should return multiple paths if there are multiple differences', () => {
            const left = { a: 1, b: { c: 2, d: 3 } };
            const right = { a: 5, b: { c: 2, d: 4, e: 5 } };
            expect(diffPaths(left, right)).toEqual([
                { path: ['a'], value: 5 },
                { path: ['b', 'd'], value: 4 },
                { path: ['b', 'e'], value: 5 }
            ]);
        });
    });

    describe('edge cases', () => {
        it('should treat arrays as atomic values', () => {
            const left = { items: [1, 2] };
            const right = { items: [1, 2, 3] };
            expect(diffPaths(left, right)).toEqual([
                { path: ['items'], value: [1, 2, 3] }
            ]);
        });

        it('should handle root replacements correctly', () => {
            // If we completely change the root type, the path is empty []
            expect(diffPaths({ a: 1 }, null)).toEqual([
                { path: [], value: null }
            ]);
            expect(diffPaths('string1', 'string2')).toEqual([
                { path: [], value: 'string2' }
            ]);
        });

        it('should handle a new object being added at the root', () => {
            const left = {};
            const right = {
                newObject: {
                    newKey: 'newValue',
                    otherKey: 'otherValue'
                }
            };
            expect(diffPaths(left, right)).toEqual([
                { path: ["newObject", 'newKey'], value: 'newValue' },
                { path: ["newObject", 'otherKey'], value: 'otherValue' },
            ]);
        });
    });
});
