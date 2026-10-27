import { Injectable, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type {
    ActivatedRouteSnapshot,
    RouterStateSnapshot,
} from '@angular/router';
import { isObservable, Observable } from 'rxjs';
import { PageMeta } from 'src/app/core/ssr/page-meta';
import { InitializeState } from 'src/app/global-states/initialize.state';
import { pageResolver } from './page.resolver';

@Injectable({ providedIn: 'root' })
class SettingsStub {
    readonly settingsReady = signal(false);
}

describe('pageResolver', () => {
    let set: jest.Mock;

    beforeEach(() => {
        set = jest.fn();
        TestBed.configureTestingModule({
            providers: [{ provide: PageMeta, useValue: { set } }],
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
        TestBed.tick();
        expect(next).not.toHaveBeenCalled();

        TestBed.inject(InitializeState).markInitialized();
        TestBed.tick();

        expect(next).toHaveBeenCalledTimes(1);
    });

    it('引数なしなら、初期化が済んでいればすぐ出す', () => {
        TestBed.inject(InitializeState).markInitialized();
        const next = jest.fn();

        run(pageResolver()).subscribe(next);
        TestBed.tick();

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith(undefined);
    });

    it('設定の保存を持つストアの token を渡したら、settingsReady が true になるまで待つ', () => {
        TestBed.inject(InitializeState).markInitialized();
        const settings = TestBed.inject(SettingsStub);
        const next = jest.fn();

        run(pageResolver(SettingsStub)).subscribe(next);
        TestBed.tick();
        expect(next).not.toHaveBeenCalled();

        settings.settingsReady.set(true);
        TestBed.tick();

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith(undefined);
    });

    it('token を渡しても、グローバルの初期化が済むまでは解決しない', () => {
        TestBed.inject(SettingsStub).settingsReady.set(true);
        const next = jest.fn();

        run(pageResolver(SettingsStub)).subscribe(next);
        TestBed.tick();
        expect(next).not.toHaveBeenCalled();

        TestBed.inject(InitializeState).markInitialized();
        TestBed.tick();

        expect(next).toHaveBeenCalledTimes(1);
    });
});
