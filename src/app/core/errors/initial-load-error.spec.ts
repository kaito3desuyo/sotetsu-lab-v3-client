import { Location } from '@angular/common';
import { Component, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
    provideRouter,
    Router,
    withNavigationErrorHandler,
} from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { GoogleAnalyticsService } from '../services/google-analytics.service';
import {
    initialLoadErrorHandler,
    LOAD_ERROR_PATH,
    LoadErrorTitle,
    loadErrorTitleResolver,
} from './initial-load-error';

@Component({ template: 'page' })
class PageComponent {}

@Component({ template: 'load-error' })
class LoadErrorStubComponent {}

const failingResolver = (): never => {
    throw new Error('initial data failed');
};

function setup(platform: 'browser' | 'server' = 'browser') {
    const sendEvent = jest.fn();
    TestBed.configureTestingModule({
        providers: [
            { provide: PLATFORM_ID, useValue: platform },
            { provide: GoogleAnalyticsService, useValue: { sendEvent } },
            provideRouter(
                [
                    {
                        path: 'ok',
                        component: PageComponent,
                        data: { title: '見えるページ' },
                    },
                    {
                        path: 'timetable',
                        resolve: { from: failingResolver },
                        children: [
                            {
                                path: 'station',
                                component: PageComponent,
                                data: { title: '駅別時刻表' },
                            },
                        ],
                    },
                    {
                        path: LOAD_ERROR_PATH,
                        component: LoadErrorStubComponent,
                        resolve: { title: loadErrorTitleResolver },
                    },
                ],
                withNavigationErrorHandler(initialLoadErrorHandler),
            ),
        ],
    });
    return { sendEvent };
}

describe('initialLoadErrorHandler', () => {
    it('最初の読み込みで失敗したら、URL はそのままで読み込めなかった画面を出す', async () => {
        setup();
        const harness = await RouterTestingHarness.create();

        await harness.navigateByUrl('/timetable/station');

        expect(harness.routeNativeElement?.textContent).toContain('load-error');
        // アドレス欄は書き換えない（ブラウザでは開いた URL のまま。実物は Playwright で確かめる）
        expect(TestBed.inject(Location).path()).not.toContain(LOAD_ERROR_PATH);
    });

    it('開こうとしたページの題を、読み込めなかった画面の題にする', async () => {
        setup();
        const harness = await RouterTestingHarness.create();

        await harness.navigateByUrl('/timetable/station');

        const router = TestBed.inject(Router);
        let snapshot = router.routerState.snapshot.root.firstChild;
        while (snapshot?.firstChild) snapshot = snapshot.firstChild;
        expect(snapshot?.data['title']).toBe('駅別時刻表');
        expect(TestBed.inject(LoadErrorTitle).title()).toBe('駅別時刻表');
    });

    it('page_load_error を GA に送る', async () => {
        const { sendEvent } = setup();
        const harness = await RouterTestingHarness.create();

        await harness.navigateByUrl('/timetable/station');

        expect(sendEvent).toHaveBeenCalledWith('page_load_error', {
            error_message: expect.stringContaining('initial data failed'),
        });
    });

    it('2 回目からの失敗では画面を替えない（通知は app.component が出す）', async () => {
        const { sendEvent } = setup();
        const harness = await RouterTestingHarness.create();
        await harness.navigateByUrl('/ok');

        await expect(
            harness.navigateByUrl('/timetable/station'),
        ).rejects.toThrow('initial data failed');

        expect(TestBed.inject(Router).url).toBe('/ok');
        expect(sendEvent).not.toHaveBeenCalled();
    });

    it('サーバーでは画面を替えない（読み込めなかった画面を CDN に置かせない）', async () => {
        setup('server');
        const harness = await RouterTestingHarness.create();

        await expect(
            harness.navigateByUrl('/timetable/station'),
        ).rejects.toThrow('initial data failed');
    });

    it('部品の読み込みの失敗では画面を替えない（app.component が読み込み直す）', async () => {
        const { sendEvent } = setup();
        TestBed.inject(Router).resetConfig([
            {
                path: 'lazy',
                loadComponent: () =>
                    Promise.reject(
                        new TypeError(
                            'Failed to fetch dynamically imported module: x.js',
                        ),
                    ),
            },
            { path: LOAD_ERROR_PATH, component: LoadErrorStubComponent },
        ]);
        const harness = await RouterTestingHarness.create();

        await expect(harness.navigateByUrl('/lazy')).rejects.toThrow(
            'Failed to fetch dynamically imported module',
        );
        expect(sendEvent).not.toHaveBeenCalled();
    });
});
