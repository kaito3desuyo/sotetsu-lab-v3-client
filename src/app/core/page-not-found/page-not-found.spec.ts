import { RESPONSE_INIT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { CACHE_CONTROL } from '../ssr/cache-control';
import { PageMeta } from '../ssr/page-meta';
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

    it('clear は見つからない題名を捨て、ルート定義の題名に戻す', () => {
        TestBed.configureTestingModule({
            providers: [{ provide: RESPONSE_INIT, useValue: null }],
        });
        const pageMeta = TestBed.inject(PageMeta);
        pageMeta.set({ title: '運用表' });
        const notFound = TestBed.inject(PageNotFound);
        notFound.mark();

        notFound.clear();
        // 同じルートで有効な URL に移ると resolver が同じ題名で set を呼ぶ
        pageMeta.set({ title: '運用表' });

        expect(TestBed.inject(Title).getTitle()).toBe(
            '運用表 - Sotetsu Lab. v3',
        );
    });

    describe('active', () => {
        beforeEach(() => {
            TestBed.configureTestingModule({
                providers: [
                    { provide: RESPONSE_INIT, useValue: null },
                    provideRouter([
                        { path: 'a', children: [] },
                        { path: 'b', children: [] },
                        {
                            path: 'denied',
                            canActivate: [() => false],
                            children: [],
                        },
                        {
                            path: 'broken',
                            canActivate: [
                                () => {
                                    throw new Error('x');
                                },
                            ],
                            children: [],
                        },
                    ]),
                ],
            });
        });

        it('mark で true、clear で false になる', () => {
            const notFound = TestBed.inject(PageNotFound);
            expect(notFound.active()).toBe(false);

            notFound.mark();
            expect(notFound.active()).toBe(true);

            notFound.clear();
            expect(notFound.active()).toBe(false);
        });

        it('別の path への NavigationEnd で false に戻る', async () => {
            const router = TestBed.inject(Router);
            await router.navigateByUrl('/a');
            const notFound = TestBed.inject(PageNotFound);
            notFound.mark();

            await router.navigateByUrl('/b');

            expect(notFound.active()).toBe(false);
        });

        it('同じ path の matrix 違い・query 違いでは戻らない', async () => {
            const router = TestBed.inject(Router);
            await router.navigateByUrl('/a');
            const notFound = TestBed.inject(PageNotFound);
            notFound.mark();

            await router.navigateByUrl('/a;x=1');
            expect(notFound.active()).toBe(true);
            await router.navigateByUrl('/a;x=1?q=2#h');
            expect(notFound.active()).toBe(true);
        });

        it('取り消し（Cancel）・失敗（Error）では戻らない', async () => {
            const router = TestBed.inject(Router);
            await router.navigateByUrl('/a');
            const notFound = TestBed.inject(PageNotFound);
            notFound.mark();

            await router.navigateByUrl('/denied');
            expect(notFound.active()).toBe(true);
            await router.navigateByUrl('/broken').catch(() => undefined);
            expect(notFound.active()).toBe(true);
        });
    });
});
