export function areSetsEqual<T>(a: Set<T>, b: Set<T>): boolean {
    return a.size === b.size && [...a].every((x) => b.has(x));
}
