import { areSetsEqual } from './are-sets-equal';

export function areArrayValuesEqual<T>(a: Array<T>, b: Array<T>): boolean {
    const aSet = new Set<T>(a);
    const bSet = new Set<T>(b);
    return areSetsEqual(aSet, bSet);
}
