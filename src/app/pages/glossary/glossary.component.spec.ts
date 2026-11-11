import { TestBed } from '@angular/core/testing';
import {
    Event as RouterEvent,
    NavigationEnd,
    provideRouter,
    Router,
    Scroll,
} from '@angular/router';
import { Subject } from 'rxjs';
import { RouterTestingHarness } from '@angular/router/testing';
import { PageMeta } from 'src/app/core/ssr/page-meta';

import { GlossaryComponent } from './glossary.component';

describe('GlossaryComponent', () => {
    const pageMeta = { set: jest.fn() };

    const render = (): HTMLElement => {
        TestBed.configureTestingModule({
            imports: [GlossaryComponent],
            providers: [
                provideRouter([]),
                { provide: PageMeta, useValue: pageMeta },
            ],
        });
        const fixture = TestBed.createComponent(GlossaryComponent);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    };

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('題名・説明・URL を PageMeta に入れる', () => {
        render();
        expect(pageMeta.set).toHaveBeenCalledWith(
            expect.objectContaining({
                title: '用語集',
                url: '/glossary',
                description: expect.any(String),
            }),
        );
    });

    it('用語ごとの見出しに英字の id がある', () => {
        const el = render();
        const ids = [
            'unyo',
            'unyo-bango',
            'unyo-gun',
            'hensei',
            'mokugeki',
            'suisoku',
            'junokuri',
            'dojitsu-hikitsugi',
            'fumei',
            'shukko',
            'nyuko',
            'kyusha',
            'chokutsu',
            'shubetsu',
            'noriutsuri',
            'nobori-kudari',
        ];
        for (const id of ids) {
            expect([id, el.querySelector(`h3#${id}`) !== null]).toEqual([
                id,
                true,
            ]);
        }
    });

    it('順送りの節に 7 群の輪と、順送りの無い群がある', () => {
        const text =
            render().querySelector('#junokuri-detail')?.textContent ?? '';
        expect(text.replace(/\s+/g, ' ')).toContain('70 → 71 → 72 → 73 → 70');
        expect(text).toContain('8 群');
        expect(text).toContain('K 群');
    });

    it('運用群の表で 74〜79 は JR 車', () => {
        const rows = Array.from(render().querySelectorAll('tr')).map(
            (tr) => tr.textContent ?? '',
        );
        expect(
            rows.some((r) => r.includes('74〜79') && r.includes('JR 車')),
        ).toBe(true);
    });

    const setUpWithRouter = async (url: string) => {
        const scroll = jest.fn();
        Element.prototype.scrollIntoView = scroll;
        TestBed.configureTestingModule({
            providers: [
                provideRouter([
                    { path: 'glossary', component: GlossaryComponent },
                ]),
                { provide: PageMeta, useValue: pageMeta },
            ],
        });
        const harness = await RouterTestingHarness.create();
        await harness.navigateByUrl(url);
        await harness.fixture.whenStable();
        await new Promise((r) => setTimeout(r, 0));
        const scrolledIds = () =>
            scroll.mock.contexts.map((el) => (el as HTMLElement).id);
        return { scrolledIds };
    };

    it('フラグメント付きで直接開くと、描画が落ち着いた後でその見出しへ移る', async () => {
        const { scrolledIds } = await setUpWithRouter('/glossary#junokuri');
        expect(scrolledIds()).toContain('junokuri');
    });

    it('アプリ内の遷移の Scroll イベント（上端へ戻す処理）の後で、その見出しへ移る', async () => {
        const { scrolledIds } = await setUpWithRouter('/glossary');
        expect(scrolledIds()).toEqual([]);

        const end = new NavigationEnd(
            2,
            '/glossary#shukko',
            '/glossary#shukko',
        );
        (TestBed.inject(Router).events as Subject<RouterEvent>).next(
            new Scroll(end, null, 'shukko'),
        );
        expect(scrolledIds()).toEqual([]);
        await new Promise((r) => setTimeout(r, 0));
        expect(scrolledIds()).toEqual(['shukko']);
    });
});
