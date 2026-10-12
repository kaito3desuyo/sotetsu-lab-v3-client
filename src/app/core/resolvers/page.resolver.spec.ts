import { TestBed } from '@angular/core/testing';
import type {
    ActivatedRouteSnapshot,
    RouterStateSnapshot,
} from '@angular/router';
import { BehaviorSubject, isObservable, Observable, Subject } from 'rxjs';
import { TitleService } from 'src/app/core/services/title.service';
import { InitializeStateQuery } from 'src/app/global-states/initialize.state';
import { pageResolver } from './page.resolver';

describe('pageResolver', () => {
    let isInitialized$: BehaviorSubject<boolean>;
    let setTitle: jest.Mock;

    beforeEach(() => {
        isInitialized$ = new BehaviorSubject(false);
        setTitle = jest.fn();
        TestBed.configureTestingModule({
            providers: [
                { provide: InitializeStateQuery, useValue: { isInitialized$ } },
                { provide: TitleService, useValue: { setTitle } },
            ],
        });
    });

    function run(resolver: ReturnType<typeof pageResolver>): Observable<void> {
        const route = {
            data: { title: '運用表' },
        } as unknown as ActivatedRouteSnapshot;
        const result = TestBed.runInInjectionContext(() =>
            resolver(route, {} as RouterStateSnapshot),
        );
        if (!isObservable(result)) throw new Error('Observable を返すこと');
        return result as Observable<void>;
    }

    it('route.data.title でタイトルを付ける', () => {
        run(pageResolver()).subscribe();

        expect(setTitle).toHaveBeenCalledWith('運用表');
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
