import { provideHttpClient } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
    ActivatedRouteSnapshot,
    provideRouter,
    Router,
    RouterStateSnapshot,
    UrlTree,
} from '@angular/router';
import { environment } from 'src/environments/environment';
import { maintenanceGuard } from './maintenance.guard';

const url = environment.backendUrl + '/maintenance';

function setup() {
    TestBed.configureTestingModule({
        providers: [
            provideRouter([]),
            provideHttpClient(),
            provideHttpClientTesting(),
        ],
    });
    return {
        controller: TestBed.inject(HttpTestingController),
        router: TestBed.inject(Router),
    };
}

function run(): Promise<boolean | UrlTree> {
    return TestBed.runInInjectionContext(() =>
        maintenanceGuard(
            {} as ActivatedRouteSnapshot,
            {} as RouterStateSnapshot,
        ),
    ) as Promise<boolean | UrlTree>;
}

describe('maintenanceGuard', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-10-14T00:00:00+09:00'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('5 秒以内に 2 回続けて通っても、maintenance は 1 回しか取らない', async () => {
        const { controller } = setup();

        const first = run();
        controller.expectOne(url).flush({ isMaintenance: false });
        expect(await first).toBe(true);
        jest.advanceTimersByTime(4000);
        const second = run();

        controller.expectNone(url);
        expect(await second).toBe(true);
        controller.verify();
    });

    it('5 秒を過ぎたら取り直す（画面を移るたびの確認は残す）', async () => {
        const { controller } = setup();

        const first = run();
        controller.expectOne(url).flush({ isMaintenance: false });
        await first;
        jest.advanceTimersByTime(5001);
        const second = run();

        controller.expectOne(url).flush({ isMaintenance: false });
        expect(await second).toBe(true);
        controller.verify();
    });

    it('メンテナンス中なら、使い回したときも /maintenance に飛ばす', async () => {
        const { controller, router } = setup();

        const first = run();
        controller.expectOne(url).flush({ isMaintenance: true });
        const firstResult = await first;
        const second = run();
        controller.expectNone(url);
        const secondResult = await second;

        expect(router.serializeUrl(firstResult as UrlTree)).toBe(
            '/maintenance',
        );
        expect(router.serializeUrl(secondResult as UrlTree)).toBe(
            '/maintenance',
        );
        controller.verify();
    });
});

describe('maintenanceGuard（サーバー）', () => {
    it('サーバーでは maintenance を取らずに通す', async () => {
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: PLATFORM_ID, useValue: 'server' },
            ],
        });
        const controller = TestBed.inject(HttpTestingController);

        expect(await run()).toBe(true);
        controller.expectNone(url);
        controller.verify();
    });
});
