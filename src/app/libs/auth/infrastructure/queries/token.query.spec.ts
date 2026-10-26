import { provideHttpClient } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { PLATFORM_ID, Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { lastValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { resetGuestTokenMemoForTest, TokenQuery } from './token.query';

const url = environment.backendUrl + '/auth/token';
const token = { accessToken: 'a', tokenType: 'Bearer', expiresAt: 1 };

function setup(extraProviders: Provider[] = []) {
    // 描画ごとに injector が新しくなるのを真似るため、毎回作り直す
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
        providers: [
            provideHttpClient(),
            provideHttpClientTesting(),
            ...extraProviders,
        ],
    });
    return {
        query: TestBed.inject(TokenQuery),
        controller: TestBed.inject(HttpTestingController),
    };
}

describe('TokenQuery', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-10-14T00:00:00+09:00'));
    });

    afterEach(() => {
        jest.useRealTimers();
        resetGuestTokenMemoForTest();
    });

    it('maxAgeMs を渡すと、5 秒以内の 2 回目は要求を出さず同じ値を返す', () => {
        const { query, controller } = setup();

        query.getToken({ maxAgeMs: 5000 }).subscribe();
        controller.expectOne(url).flush(token);
        jest.advanceTimersByTime(4000);
        let got: unknown;
        query.getToken({ maxAgeMs: 5000 }).subscribe((v) => (got = v));

        controller.expectNone(url);
        expect(got).toEqual(token);
        controller.verify();
    });

    it('maxAgeMs を渡しても、5 秒を過ぎたら取り直す', () => {
        const { query, controller } = setup();

        query.getToken({ maxAgeMs: 5000 }).subscribe();
        controller.expectOne(url).flush(token);
        jest.advanceTimersByTime(5001);
        query.getToken({ maxAgeMs: 5000 }).subscribe();

        controller.expectOne(url).flush(token);
        controller.verify();
    });

    it('maxAgeMs を渡さないと、毎回要求を出す（ログイン・ログアウト・期限切れの取り直し）', () => {
        const { query, controller } = setup();

        query.getToken().subscribe();
        controller.expectOne(url).flush(token);
        query.getToken().subscribe();

        controller.expectOne(url).flush(token);
        controller.verify();
    });

    it('bypassHttpCache を渡すと、毎回違う乱数のクエリを付けて取りに行く（使い回された応答を避ける）', () => {
        const { query, controller } = setup();

        query.getToken({ bypassHttpCache: true }).subscribe();
        query.getToken({ bypassHttpCache: true }).subscribe();

        const reqs = controller.match((r) => r.url === url);
        expect(reqs).toHaveLength(2);
        const [a, b] = reqs.map((r) => r.request.params.get('r'));
        expect(a).toMatch(/^[0-9a-z]+$/);
        expect(b).toMatch(/^[0-9a-z]+$/);
        expect(a).not.toBe(b);
        reqs.forEach((r) => r.flush(token));
        controller.verify();
    });

    it('bypassHttpCache を渡さなければ、クエリは付けない', () => {
        const { query, controller } = setup();

        query.getToken().subscribe();

        const req = controller.expectOne(url);
        expect(req.request.params.keys()).toEqual([]);
        req.flush(token);
        controller.verify();
    });

    it('渡さずに取った値は、続く maxAgeMs 付きの呼び出しで使い回される（ログイン直後の画面移動）', () => {
        const { query, controller } = setup();
        const guest = { accessToken: null, tokenType: null, expiresAt: null };

        query.getToken({ maxAgeMs: 5000 }).subscribe();
        controller.expectOne(url).flush(guest);
        query.getToken().subscribe();
        controller.expectOne(url).flush(token);
        let got: unknown;
        query.getToken({ maxAgeMs: 5000 }).subscribe((v) => (got = v));

        controller.expectNone(url);
        expect(got).toEqual(token);
        controller.verify();
    });

    it('204 なら null を返す', async () => {
        const { query, controller } = setup();
        jest.useRealTimers();

        const result = lastValueFrom(query.getToken());
        controller
            .expectOne(url)
            .flush(null, { status: 204, statusText: 'No Content' });

        await expect(result).resolves.toBeNull();
        controller.verify();
    });

    describe('サーバーでは（ゲストのトークンをプロセスの中で使い回す）', () => {
        const server: Provider[] = [
            { provide: PLATFORM_ID, useValue: 'server' },
        ];
        const nowSec = () => Math.floor(Date.now() / 1000);
        const guestToken = (secondsLeft: number) => ({
            accessToken: 'guest',
            tokenType: 'Bearer',
            expiresAt: nowSec() + secondsLeft,
        });

        it('別の描画（新しい injector）の 2 回目は、要求を出さず同じ値を返す', () => {
            const first = setup(server);
            const issued = guestToken(3600);
            first.query.getToken({ maxAgeMs: 5000 }).subscribe();
            first.controller.expectOne(url).flush(issued);

            const second = setup(server);
            let got: unknown;
            second.query
                .getToken({ maxAgeMs: 5000 })
                .subscribe((v) => (got = v));

            second.controller.expectNone(url);
            expect(got).toEqual(issued);
            second.controller.verify();
        });

        it('期限の 60 秒前までは使い回し、それを過ぎたら取り直す', () => {
            const first = setup(server);
            first.query.getToken({ maxAgeMs: 5000 }).subscribe();
            first.controller.expectOne(url).flush(guestToken(3600));

            jest.advanceTimersByTime((3600 - 61) * 1000);
            const beforeLimit = setup(server);
            beforeLimit.query.getToken({ maxAgeMs: 5000 }).subscribe();
            beforeLimit.controller.expectNone(url);

            jest.advanceTimersByTime(2 * 1000);
            const afterLimit = setup(server);
            afterLimit.query.getToken({ maxAgeMs: 5000 }).subscribe();
            afterLimit.controller.expectOne(url).flush(guestToken(3600));
            afterLimit.controller.verify();
        });

        it('取り直したら、新しい値を覚え直す', () => {
            const first = setup(server);
            first.query.getToken({ maxAgeMs: 5000 }).subscribe();
            first.controller.expectOne(url).flush(guestToken(100));

            jest.advanceTimersByTime(50 * 1000);
            const second = setup(server);
            second.query.getToken({ maxAgeMs: 5000 }).subscribe();
            const renewed = { ...guestToken(3600), accessToken: 'renewed' };
            second.controller.expectOne(url).flush(renewed);

            const third = setup(server);
            let got: unknown;
            third.query
                .getToken({ maxAgeMs: 5000 })
                .subscribe((v) => (got = v));
            third.controller.expectNone(url);
            expect(got).toEqual(renewed);
        });

        it('maxAgeMs を渡さない強制の取り直しは、覚えたものを素通りして要求を出す（401 の取り直し）', () => {
            const first = setup(server);
            first.query.getToken({ maxAgeMs: 5000 }).subscribe();
            first.controller.expectOne(url).flush(guestToken(3600));

            const second = setup(server);
            second.query.getToken().subscribe();
            const renewed = { ...guestToken(3600), accessToken: 'renewed' };
            second.controller.expectOne(url).flush(renewed);

            // 取り直した値が次から使われる（古いトークンを返し続けない）
            const third = setup(server);
            let got: unknown;
            third.query
                .getToken({ maxAgeMs: 5000 })
                .subscribe((v) => (got = v));
            third.controller.expectNone(url);
            expect(got).toEqual(renewed);
        });

        it('bypassHttpCache を渡した取り直しも、覚えたものを素通りして要求を出す', () => {
            const first = setup(server);
            first.query.getToken({ maxAgeMs: 5000 }).subscribe();
            first.controller.expectOne(url).flush(guestToken(3600));

            const second = setup(server);
            second.query
                .getToken({ maxAgeMs: 5000, bypassHttpCache: true })
                .subscribe();

            second.controller
                .expectOne((r) => r.url === url)
                .flush(guestToken(3600));
            second.controller.verify();
        });

        it('204（null）は覚えない', () => {
            const first = setup(server);
            first.query.getToken({ maxAgeMs: 5000 }).subscribe();
            first.controller
                .expectOne(url)
                .flush(null, { status: 204, statusText: 'No Content' });

            const second = setup(server);
            second.query.getToken({ maxAgeMs: 5000 }).subscribe();

            second.controller.expectOne(url).flush(guestToken(3600));
            second.controller.verify();
        });
    });

    it('ブラウザでは、別の TokenQuery には持ち越さない（毎回取りに行く）', () => {
        const first = setup();
        first.query.getToken({ maxAgeMs: 5000 }).subscribe();
        first.controller.expectOne(url).flush({
            ...token,
            expiresAt: Math.floor(Date.now() / 1000) + 3600,
        });

        const second = setup();
        second.query.getToken({ maxAgeMs: 5000 }).subscribe();

        second.controller.expectOne(url).flush(token);
        second.controller.verify();
    });
});
