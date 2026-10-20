import { provideHttpClient } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import { UserQuery } from './user.query';

const url = environment.backendUrl + '/user/profile';
const model = {
    userId: 'u1',
    username: 'kaito',
    password: 'x',
    displayName: 'K',
    role: 'admin',
};

function setup() {
    TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return {
        query: TestBed.inject(UserQuery),
        controller: TestBed.inject(HttpTestingController),
    };
}

describe('UserQuery.getProfile', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-10-14T00:00:00+09:00'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('ログイン中は password を落とした DTO を返す', () => {
        const { query, controller } = setup();
        let got: unknown;

        query.getProfile().subscribe((v) => (got = v));
        controller.expectOne(url).flush(model);

        expect(got).toEqual({
            userId: 'u1',
            username: 'kaito',
            displayName: 'K',
            role: 'admin',
        });
        controller.verify();
    });

    it('ゲストの 401 は null になり、maxAgeMs 以内の 2 回目は要求を出さない', () => {
        const { query, controller } = setup();
        const got: unknown[] = [];

        query.getProfile({ maxAgeMs: 5000 }).subscribe((v) => got.push(v));
        controller
            .expectOne(url)
            .flush(null, { status: 401, statusText: 'Unauthorized' });
        jest.advanceTimersByTime(4000);
        query.getProfile({ maxAgeMs: 5000 }).subscribe((v) => got.push(v));

        controller.expectNone(url);
        expect(got).toEqual([null, null]);
        controller.verify();
    });

    it('500 は失敗のまま返し、次の呼び出しで取り直す', () => {
        const { query, controller } = setup();
        let error: unknown;

        query
            .getProfile({ maxAgeMs: 5000 })
            .subscribe({ error: (e) => (error = e) });
        controller
            .expectOne(url)
            .flush(null, { status: 500, statusText: 'Server Error' });
        query.getProfile({ maxAgeMs: 5000 }).subscribe();

        expect(error).toBeTruthy();
        controller.expectOne(url).flush(model);
        controller.verify();
    });

    it('渡さずに取った値は、続く maxAgeMs 付きの呼び出しで使い回される（ログイン直後の画面移動）', () => {
        const { query, controller } = setup();
        let got: unknown;

        query.getProfile({ maxAgeMs: 5000 }).subscribe();
        controller
            .expectOne(url)
            .flush(null, { status: 401, statusText: 'Unauthorized' });
        query.getProfile().subscribe();
        controller.expectOne(url).flush(model);
        query.getProfile({ maxAgeMs: 5000 }).subscribe((v) => (got = v));

        controller.expectNone(url);
        expect(got).toMatchObject({ userId: 'u1' });
        controller.verify();
    });
});
