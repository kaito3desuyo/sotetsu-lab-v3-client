import { defer, of, throwError } from 'rxjs';
import { QueryCache } from './query-cache';

describe('QueryCache', () => {
    it('同じ name と params なら fetch を 1 回しか呼ばず、同じ Observable を返す', () => {
        const cache = new QueryCache();
        const fetch = jest.fn(() => of(1));

        const a = cache.get({ name: 'find', params: { id: 'x' }, fetch });
        const b = cache.get({ name: 'find', params: { id: 'x' }, fetch });

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(a).toBe(b);
    });

    it('params が違えば別に覚える', () => {
        const cache = new QueryCache();
        const fetch = jest.fn(() => of(1));

        cache.get({ name: 'find', params: { id: 'x' }, fetch });
        cache.get({ name: 'find', params: { id: 'y' }, fetch });

        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('購読を何回しても、元の取得は 1 回だけ走る', () => {
        const cache = new QueryCache();
        let runs = 0;
        const obs = cache.get({
            name: 'find',
            params: {},
            fetch: () => defer(() => of(++runs)),
        });

        const got: number[] = [];
        obs.subscribe((v) => got.push(v));
        obs.subscribe((v) => got.push(v));

        expect(runs).toBe(1);
        expect(got).toEqual([1, 1]);
    });

    it('forceReload なら作り直す', () => {
        const cache = new QueryCache();
        const fetch = jest.fn(() => of(1));

        cache.get({ name: 'find', params: { id: 'x' }, fetch });
        cache.get({
            name: 'find',
            params: { id: 'x' },
            fetch,
            forceReload: true,
        });

        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('エラーになったら、次の購読で取り直す', () => {
        const cache = new QueryCache();
        let runs = 0;
        const obs = cache.get({
            name: 'find',
            params: {},
            fetch: () =>
                defer(() => (++runs === 1 ? throwError(() => 'ng') : of(runs))),
        });

        obs.subscribe({ error: () => undefined });
        let value: number | undefined;
        obs.subscribe((v) => (value = v));

        expect(runs).toBe(2);
        expect(value).toBe(2);
    });

    it('clear(names) はその name だけを捨てる', () => {
        const cache = new QueryCache();
        const fetchA = jest.fn(() => of('a'));
        const fetchB = jest.fn(() => of('b'));
        const load = () => {
            cache.get({ name: 'a', params: { id: 1 }, fetch: fetchA });
            cache.get({ name: 'a', params: { id: 2 }, fetch: fetchA });
            cache.get({ name: 'b', params: { id: 1 }, fetch: fetchB });
        };
        load();

        cache.clear(['a']);
        load();

        expect(fetchA).toHaveBeenCalledTimes(4);
        expect(fetchB).toHaveBeenCalledTimes(1);
    });

    it('clear() は全部捨てる', () => {
        const cache = new QueryCache();
        const fetchA = jest.fn(() => of('a'));
        const fetchB = jest.fn(() => of('b'));
        const load = () => {
            cache.get({ name: 'a', params: {}, fetch: fetchA });
            cache.get({ name: 'b', params: {}, fetch: fetchB });
        };
        load();

        cache.clear();
        load();

        expect(fetchA).toHaveBeenCalledTimes(2);
        expect(fetchB).toHaveBeenCalledTimes(2);
    });
});
