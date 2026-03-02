import { describe, it, expect } from 'vitest';
import {calculateDelta} from "./DeltaGenerator";
import {Model} from "@web/schema";

// Assuming the types and function are imported from your module
// import { calculateDelta, Model, ModelDelta } from './your-module';

// Test model interfaces
interface User extends Model {
    name: string;
    email: string;
    age: number;
}

interface Product extends Model {
    title: string;
    price: number;
    inStock: boolean;
    metadata: {
        category: string;
        tags: string[];
    };
}

describe('calculateDelta', () => {
    describe('basic functionality', () => {
        it('should return null when models are identical', () => {
            const user: User = {
                id: 'user-1',
                updatedAt: new Date('2024-01-01').getTime(),
                name: 'John Doe',
                email: 'john@example.com',
                age: 30
            };

            const result = calculateDelta(user, user);
            expect(result).toBeNull();
        });

        it('should return null when only updatedAt differs', () => {
            const userBefore: User = {
                id: 'user-1',
                updatedAt: new Date('2024-01-01').getTime(),
                name: 'John Doe',
                email: 'john@example.com',
                age: 30
            };

            const userAfter: User = {
                ...userBefore,
                updatedAt: new Date('2024-01-02').getTime()
            };

            const result = calculateDelta(userBefore, userAfter);
            expect(result).toBeNull();
        });

        it('should detect single field change', () => {
            const userBefore: User = {
                id: 'user-1',
                updatedAt: new Date('2024-01-01').getTime(),
                name: 'John Doe',
                email: 'john@example.com',
                age: 30
            };

            const userAfter: User = {
                ...userBefore,
                updatedAt: new Date('2024-01-02').getTime(),
                name: 'John Smith'
            };

            const result = calculateDelta(userBefore, userAfter);
            expect(result).toEqual({
                modelId: 'user-1',
                timestamp: new Date('2024-01-02').getTime(),
                name: 'John Smith'
            });
        });

        it('should detect multiple field changes', () => {
            const userBefore: User = {
                id: 'user-1',
                updatedAt: new Date('2024-01-01').getTime(),
                name: 'John Doe',
                email: 'john@example.com',
                age: 30
            };

            const userAfter: User = {
                ...userBefore,
                updatedAt: new Date('2024-01-02').getTime(),
                name: 'John Smith',
                age: 31,
                email: 'johnsmith@example.com'
            };

            const result = calculateDelta(userBefore, userAfter);
            expect(result).toEqual({
                modelId: 'user-1',
                timestamp: new Date('2024-01-02').getTime(),
                name: 'John Smith',
                age: 31,
                email: 'johnsmith@example.com'
            });
        });
    });

    describe('error handling', () => {
        it('should throw error when comparing models with different IDs', () => {
            const user1: User = {
                id: 'user-1',
                updatedAt: new Date('2024-01-01').getTime(),
                name: 'John Doe',
                email: 'john@example.com',
                age: 30
            };

            const user2: User = {
                id: 'user-2',
                updatedAt: new Date('2024-01-01').getTime(),
                name: 'Jane Doe',
                email: 'jane@example.com',
                age: 25
            };

            expect(() => calculateDelta(user1, user2)).toThrow(
                'Cannot calculate solidDelta between different models'
            );
        });
    });

    describe('complex object handling', () => {
        it('should detect changes in nested objects', () => {
            const productBefore: Product = {
                id: 'product-1',
                updatedAt: new Date('2024-01-01').getTime(),
                title: 'Laptop',
                price: 999.99,
                inStock: true,
                metadata: {
                    category: 'electronics',
                    tags: ['computer', 'portable']
                }
            };

            const productAfter: Product = {
                ...productBefore,
                updatedAt: new Date('2024-01-02').getTime(),
                metadata: {
                    category: 'electronics',
                    tags: ['computer', 'portable', 'gaming']
                }
            };

            const result = calculateDelta(productBefore, productAfter);
            expect(result).toEqual({
                modelId: 'product-1',
                timestamp: new Date('2024-01-02').getTime(),
                metadata: {
                    category: 'electronics',
                    tags: ['computer', 'portable', 'gaming']
                }
            });
        });

        it('should return null when nested objects are identical', () => {
            const product: Product = {
                id: 'product-1',
                updatedAt: new Date('2024-01-01').getTime(),
                title: 'Laptop',
                price: 999.99,
                inStock: true,
                metadata: {
                    category: 'electronics',
                    tags: ['computer', 'portable']
                }
            };

            const productCopy: Product = {
                ...product,
                updatedAt: new Date('2024-01-02').getTime(),
                metadata: {
                    ...product.metadata,
                    tags: [...product.metadata.tags]
                }
            };

            const result = calculateDelta(product, productCopy);
            expect(result).toBeNull();
        });

        it('should detect multiple changes including nested objects', () => {
            const productBefore: Product = {
                id: 'product-1',
                updatedAt: new Date('2024-01-01').getTime(),
                title: 'Laptop',
                price: 999.99,
                inStock: true,
                metadata: {
                    category: 'electronics',
                    tags: ['computer']
                }
            };

            const productAfter: Product = {
                ...productBefore,
                updatedAt: new Date('2024-01-02').getTime(),
                title: 'Gaming Laptop',
                price: 1299.99,
                metadata: {
                    category: 'gaming',
                    tags: ['computer', 'gaming']
                }
            };

            const result = calculateDelta(productBefore, productAfter);
            expect(result).toEqual({
                modelId: 'product-1',
                timestamp: new Date('2024-01-02').getTime(),
                title: 'Gaming Laptop',
                price: 1299.99,
                metadata: {
                    category: 'gaming',
                    tags: ['computer', 'gaming']
                }
            });
        });
    });

    describe('edge cases', () => {
        it('should handle null values', () => {
            interface UserWithOptional extends Model {
                name: string;
                nickname: string | null;
            }

            const userBefore: UserWithOptional = {
                id: 'user-1',
                updatedAt: new Date('2024-01-01').getTime(),
                name: 'John',
                nickname: 'Johnny'
            };

            const userAfter: UserWithOptional = {
                ...userBefore,
                updatedAt: new Date('2024-01-02').getTime(),
                nickname: null
            };

            const result = calculateDelta(userBefore, userAfter);
            expect(result).toEqual({
                modelId: 'user-1',
                timestamp: new Date('2024-01-02').getTime(),
                nickname: null
            });
        });

        it('should handle undefined values', () => {
            interface UserWithOptional extends Model {
                name: string;
                nickname?: string;
            }

            const userBefore: UserWithOptional = {
                id: 'user-1',
                updatedAt: new Date('2024-01-01').getTime(),
                name: 'John',
                nickname: 'Johnny'
            };

            const userAfter: UserWithOptional = {
                id: 'user-1',
                updatedAt: new Date('2024-01-02').getTime(),
                name: 'John'
                // nickname is undefined (omitted)
            };

            const result = calculateDelta(userBefore, userAfter);
            expect(result).toEqual({
                modelId: 'user-1',
                timestamp: new Date('2024-01-02').getTime(),
                nickname: undefined
            });
        });

        it('should handle boolean changes', () => {
            const productBefore: Product = {
                id: 'product-1',
                updatedAt: new Date('2024-01-01').getTime(),
                title: 'Laptop',
                price: 999.99,
                inStock: true,
                metadata: {
                    category: 'electronics',
                    tags: []
                }
            };

            const productAfter: Product = {
                ...productBefore,
                updatedAt: new Date('2024-01-02').getTime(),
                inStock: false
            };

            const result = calculateDelta(productBefore, productAfter);
            expect(result).toEqual({
                modelId: 'product-1',
                timestamp: new Date('2024-01-02').getTime(),
                inStock: false
            });
        });

        it('should handle empty arrays vs populated arrays', () => {
            const productBefore: Product = {
                id: 'product-1',
                updatedAt: new Date('2024-01-01').getTime(),
                title: 'Laptop',
                price: 999.99,
                inStock: true,
                metadata: {
                    category: 'electronics',
                    tags: []
                }
            };

            const productAfter: Product = {
                ...productBefore,
                updatedAt: new Date('2024-01-02').getTime(),
                metadata: {
                    category: 'electronics',
                    tags: ['new']
                }
            };

            const result = calculateDelta(productBefore, productAfter);
            expect(result).toEqual({
                modelId: 'product-1',
                timestamp: new Date('2024-01-02').getTime(),
                metadata: {
                    category: 'electronics',
                    tags: ['new']
                }
            });
        });
    });
});
