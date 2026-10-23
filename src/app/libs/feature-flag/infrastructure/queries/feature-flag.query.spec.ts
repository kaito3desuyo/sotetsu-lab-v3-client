import { provideHttpClient } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import { FeatureFlagQuery } from './feature-flag.query';

const url = environment.apiUrl + '/v3/feature-flags';

function setup() {
    TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return {
        query: TestBed.inject(FeatureFlagQuery),
        controller: TestBed.inject(HttpTestingController),
    };
}

describe('FeatureFlagQuery.findAll', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-10-23T00:00:00+09:00'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('/v3/feature-flags の本文をそのまま返す', () => {
        const { query, controller } = setup();
        let got: unknown;

        query.findAll().subscribe((v) => (got = v));
        controller.expectOne(url).flush({ registered_only_posting: true });

        expect(got).toEqual({ registered_only_posting: true });
    });

    it('60 秒以内の 2 回目は HTTP を呼ばず、過ぎたら取り直す', () => {
        const { query, controller } = setup();

        query.findAll().subscribe();
        controller.expectOne(url).flush({});
        jest.advanceTimersByTime(59_000);
        query.findAll().subscribe();
        controller.expectNone(url);

        jest.advanceTimersByTime(2_000);
        query.findAll().subscribe();
        controller.expectOne(url).flush({});
    });
});
