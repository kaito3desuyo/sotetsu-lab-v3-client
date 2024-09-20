import { isObservable, Observable } from 'rxjs';

export type Result<T, E extends Error> = Success<T> | Failure<E>;
export type PromiseResult<T, E extends Error> = Promise<Result<T, E>>;

export class Success<T> {
    readonly value: T;

    constructor(value?: T) {
        this.value = value;
    }

    isSuccess(): this is Success<T> {
        return true;
    }

    isFailure(): this is Failure<Error> {
        return false;
    }
}

export class Failure<E extends Error> {
    readonly error: E;

    constructor(error: E) {
        this.error = error;
    }

    isSuccess(): this is Success<unknown> {
        return false;
    }

    isFailure(): this is Failure<E> {
        return true;
    }
}

export async function tryCatchAsync<T, E extends Error>(
    fn: Observable<T> | Promise<T>,
    onCatch: (e: unknown) => E = (e) => e as E,
): PromiseResult<T, E> {
    try {
        if (isObservable(fn)) {
            const result = await fn.toPromise();
            return new Success(result);
        } else {
            const result = await fn;
            return new Success(result);
        }
    } catch (e: unknown) {
        return new Failure(onCatch(e));
    }
}
