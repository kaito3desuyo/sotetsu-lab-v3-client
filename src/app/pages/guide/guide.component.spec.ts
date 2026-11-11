import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PageMeta } from 'src/app/core/ssr/page-meta';

import { GuideComponent } from './guide.component';

describe('GuideComponent', () => {
    const pageMeta = { set: jest.fn() };

    const render = (): HTMLElement => {
        TestBed.configureTestingModule({
            imports: [GuideComponent],
            providers: [
                provideRouter([]),
                { provide: PageMeta, useValue: pageMeta },
            ],
        });
        const fixture = TestBed.createComponent(GuideComponent);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    };

    it('題名・説明・URL を PageMeta に入れる', () => {
        render();
        expect(pageMeta.set).toHaveBeenCalledWith(
            expect.objectContaining({
                title: '使い方',
                url: '/guide',
                description: expect.any(String),
            }),
        );
    });

    it('「相鉄の運用の流れ」と「やりたいこと別の使い方」の見出しがある', () => {
        const headings = Array.from(render().querySelectorAll('h2')).map((h) =>
            h.textContent?.trim(),
        );
        expect(headings).toEqual(
            expect.arrayContaining([
                '相鉄の運用の流れ',
                'やりたいこと別の使い方',
            ]),
        );
    });

    it('用語集へのリンクがある', () => {
        expect(render().querySelector('a[href="/glossary"]')).not.toBeNull();
    });

    it('順送りを 1 群の 11〜16 で例示する', () => {
        const text = render().textContent ?? '';
        for (const n of ['11', '12', '13', '14', '15', '16']) {
            expect(text).toContain(n);
        }
        expect(text).toContain('順送り');
    });

    it('JR 線内で見たときは「列車から選ぶ」を案内する', () => {
        expect(render().textContent).toContain('列車から選ぶ');
    });
});
