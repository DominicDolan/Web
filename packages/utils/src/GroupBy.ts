

export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((result, item) => {
        const groupKey = item[key];
        if (!result[groupKey as string]) {
            result[groupKey as string] = [];
        }
        result[groupKey as string].push(item);
        return result;
    }, {} as Record<string, T[]>);
}
