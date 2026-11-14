import { RESPONSE_INIT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { CACHE_CONTROL } from '../ssr/cache-control';
import { PageNotFound } from './page-not-found';

describe('PageNotFound', () => {
    it('mark は 404・短いキャッシュ・題名を設定する', () => {
        const init: ResponseInit = { headers: new Headers() };
        TestBed.configureTestingModule({
            providers: [{ provide: RESPONSE_INIT, useValue: init }],
        });

        TestBed.inject(PageNotFound).mark();

        expect(init.status).toBe(404);
        expect((init.headers as Headers).get('Cache-Control')).toBe(
            CACHE_CONTROL.short,
        );
        expect(TestBed.inject(Title).getTitle()).toContain(PageNotFound.title);
        expect(PageNotFound.title).toBe('ページが見つかりません');
    });

    it('ブラウザ（RESPONSE_INIT が無い）でも題名を設定でき、落ちない', () => {
        TestBed.configureTestingModule({
            providers: [{ provide: RESPONSE_INIT, useValue: null }],
        });

        expect(() => TestBed.inject(PageNotFound).mark()).not.toThrow();
        expect(TestBed.inject(Title).getTitle()).toContain(PageNotFound.title);
    });
});
