export function uniqueBy<T>(args: T[], key?: keyof T): T[] {
    const valueSet = new Set();
    return args.filter((arg) => {
        const value = key ? arg[key] : arg;
        if (valueSet.has(value)) {
            return false;
        }
        valueSet.add(value);
        return true;
    });
}
