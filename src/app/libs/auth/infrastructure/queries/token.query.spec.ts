import { provideHttpClient } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { lastValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { TokenQuery } from './token.query';

const url = environment.backendUrl + '/auth/token';
const token = { accessToken: 'a', tokenType: 'Bearer', expiresAt: 1 };

function setup() {
    TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting()],
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
});
