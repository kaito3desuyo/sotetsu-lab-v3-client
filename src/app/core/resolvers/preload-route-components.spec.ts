import type { ActivatedRouteSnapshot, Route } from '@angular/router';
import { preloadRouteComponents } from './preload-route-components';

function snapshot(
    routeConfig: Route | null,
    children: ActivatedRouteSnapshot[] = [],
): ActivatedRouteSnapshot {
    return { routeConfig, children } as unknown as ActivatedRouteSnapshot;
}

/** 拒否された Promise の後始末を流す */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('preloadRouteComponents', () => {
    it('子孫まで辿って loadComponent を呼ぶ', () => {
        const leaf = jest.fn(() => Promise.resolve(class {}));
        const middle = jest.fn(() => Promise.resolve(class {}));

        preloadRouteComponents(
            snapshot(null, [
                snapshot({ path: 'operation' }, [
                    snapshot({ path: 'table', loadComponent: middle }, [
                        snapshot({ path: '', loadComponent: leaf }),
                    ]),
                ]),
            ]),
        );

        expect(middle).toHaveBeenCalledTimes(1);
        expect(leaf).toHaveBeenCalledTimes(1);
    });

    it('loadComponent が無いルートでは何もしない', () => {
        expect(() =>
            preloadRouteComponents(
                snapshot(null, [snapshot({ path: 'library' })]),
            ),
        ).not.toThrow();
    });

    it('snapshot が無くても例外を出さない', () => {
        expect(() => preloadRouteComponents(undefined)).not.toThrow();
        expect(() => preloadRouteComponents(null)).not.toThrow();
    });

    it('loadComponent が reject しても未処理の拒否にしない（catch を付ける）', async () => {
        const rejected = Promise.reject(new Error('chunk load failed'));
        const catchSpy = jest.spyOn(rejected, 'catch');

        preloadRouteComponents(
            snapshot(null, [
                snapshot({ path: '', loadComponent: () => rejected }),
            ]),
        );
        await flush();

        expect(catchSpy).toHaveBeenCalledTimes(1);
    });

    it('Promise でない thenable が返っても、取り込んで拒否を握る', async () => {
        const thenable = {
            then: jest.fn(
                (_resolve: (v: unknown) => void, reject: (e: Error) => void) =>
                    reject(new Error('chunk load failed')),
            ),
        };

        preloadRouteComponents(
            snapshot(null, [
                snapshot({
                    path: '',
                    loadComponent: () =>
                        thenable as unknown as Promise<new () => unknown>,
                }),
            ]),
        );
        await flush();

        expect(thenable.then).toHaveBeenCalledTimes(1);
    });

    it('loadComponent が同期で例外を投げても外に漏らさない', () => {
        expect(() =>
            preloadRouteComponents(
                snapshot(null, [
                    snapshot({
                        path: '',
                        loadComponent: () => {
                            throw new Error('boom');
                        },
                    }),
                ]),
            ),
        ).not.toThrow();
    });
});
