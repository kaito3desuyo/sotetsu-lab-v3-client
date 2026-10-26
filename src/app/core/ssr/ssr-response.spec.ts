import { RESPONSE_INIT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CACHE_CONTROL, CACHE_TAG_HEADER } from './cache-control';
import { SsrResponse } from './ssr-response';

function setup(init: ResponseInit | null) {
    TestBed.configureTestingModule({
        providers: [{ provide: RESPONSE_INIT, useValue: init }],
    });
    return TestBed.inject(SsrResponse);
}

describe('SsrResponse', () => {
    it('ブラウザ（RESPONSE_INIT が無い）では何もしない', () => {
        const response = setup(null);

        expect(() => {
            response.setCachePolicy('short');
            response.addCacheTags(['calendar:a']);
        }).not.toThrow();
    });

    it('置く長さを Cache-Control に書く', () => {
        const init: ResponseInit = { headers: new Headers() };
        setup(init).setCachePolicy('long');

        expect((init.headers as Headers).get('Cache-Control')).toBe(
            CACHE_CONTROL.long,
        );
    });

    it('短いほうを優先し、一度短くしたら長く戻さない', () => {
        const init: ResponseInit = { headers: new Headers() };
        const response = setup(init);

        response.setCachePolicy('short');
        response.setCachePolicy('long');
        expect((init.headers as Headers).get('Cache-Control')).toBe(
            CACHE_CONTROL.short,
        );

        response.setCachePolicy('no-store');
        response.setCachePolicy('short');
        expect((init.headers as Headers).get('Cache-Control')).toBe('no-store');
    });

    it('ルートの既定が short なら、最初の long でも short のまま（既定より長くしない）', () => {
        const init: ResponseInit = {
            headers: { 'Cache-Control': CACHE_CONTROL.short },
        };
        setup(init).setCachePolicy('long');

        expect(new Headers(init.headers).get('Cache-Control')).toBe(
            CACHE_CONTROL.short,
        );
    });

    it('ルートの既定が no-store なら、short にも long にも上書きしない', () => {
        const init: ResponseInit = {
            headers: new Headers({
                'Cache-Control': CACHE_CONTROL['no-store'],
            }),
        };
        const response = setup(init);

        response.setCachePolicy('short');
        response.setCachePolicy('long');

        expect((init.headers as Headers).get('Cache-Control')).toBe('no-store');
    });

    it('headers がオブジェクトでも Headers にして書く', () => {
        const init: ResponseInit = { headers: { 'X-Other': '1' } };
        setup(init).setCachePolicy('short');

        const headers = init.headers as Headers;
        expect(headers.get('X-Other')).toBe('1');
        expect(headers.get('Cache-Control')).toBe(CACHE_CONTROL.short);
    });

    it('タグを重ねずカンマ区切りの小文字で書く', () => {
        const init: ResponseInit = { headers: new Headers() };
        const response = setup(init);

        response.addCacheTags(['calendar:ABC']);
        response.addCacheTags(['calendar:abc', 'sighting-date:2026-10-01']);

        expect((init.headers as Headers).get(CACHE_TAG_HEADER)).toBe(
            'calendar:abc,sighting-date:2026-10-01',
        );
    });

    it('51 個を超えたらタグを外し、短く置く（失効で消せないので）', () => {
        const init: ResponseInit = { headers: new Headers() };
        const response = setup(init);
        response.setCachePolicy('long');

        response.addCacheTags(
            Array.from({ length: 51 }, (_, i) => `sighting-date:d${i}`),
        );

        const headers = init.headers as Headers;
        expect(headers.has(CACHE_TAG_HEADER)).toBe(false);
        expect(headers.get('Cache-Control')).toBe(CACHE_CONTROL.short);
    });
});
