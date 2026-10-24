import { TestBed } from '@angular/core/testing';
import type {
    ActivatedRouteSnapshot,
    RouterStateSnapshot,
} from '@angular/router';
import { BehaviorSubject, isObservable, Observable, Subject } from 'rxjs';
import { PageMeta } from 'src/app/core/ssr/page-meta';
import { InitializeStateQuery } from 'src/app/global-states/initialize.state';
import { pageResolver } from './page.resolver';

describe('pageResolver', () => {
    let isInitialized$: BehaviorSubject<boolean>;
    let set: jest.Mock;

    beforeEach(() => {
        isInitialized$ = new BehaviorSubject(false);
        set = jest.fn();
        TestBed.configureTestingModule({
            providers: [
                { provide: InitializeStateQuery, useValue: { isInitialized$ } },
                { provide: PageMeta, useValue: { set } },
            ],
        });
    });

    function run(resolver: ReturnType<typeof pageResolver>): Observable<void> {
        const route = {
            data: { title: '運用表', description: '説明' },
        } as unknown as ActivatedRouteSnapshot;
        const result = TestBed.runInInjectionContext(() =>
            resolver(route, {
                url: '/operation/table',
            } as RouterStateSnapshot),
        );
        if (!isObservable(result)) throw new Error('Observable を返すこと');
        return result as Observable<void>;
    }

    it('route.data と URL で題名・説明・OGP を入れる', () => {
        run(pageResolver()).subscribe();

        expect(set).toHaveBeenCalledWith({
            title: '運用表',
            description: '説明',
            url: '/operation/table',
        });
    });

    it('グローバルの初期化が済むまで解決しない', () => {
        const next = jest.fn();
        run(pageResolver()).subscribe(next);
        expect(next).not.toHaveBeenCalled();

        isInitialized$.next(true);

        expect(next).toHaveBeenCalledTimes(1);
    });

    it('ストアの永続化を渡したら、その復元も待つ', () => {
        const persistInitialized$ = new Subject<boolean>();
        const next = jest.fn();
        isInitialized$.next(true);

        run(pageResolver(persistInitialized$)).subscribe(next);
        expect(next).not.toHaveBeenCalled();

        persistInitialized$.next(true);

        expect(next).toHaveBeenCalledTimes(1);
    });
});
