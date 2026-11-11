import { TestBed } from '@angular/core/testing';
import {
    MAT_BOTTOM_SHEET_DATA,
    MatBottomSheetRef,
} from '@angular/material/bottom-sheet';
import { provideRouter } from '@angular/router';
import { GoogleAnalyticsService } from 'src/app/core/services/google-analytics.service';
import { findPageHelp, SITE_INTRO } from './page-help';
import {
    PageHelpSheetComponent,
    PageHelpSheetData,
} from './page-help-sheet.component';

describe('PageHelpSheetComponent', () => {
    let sendEvent: jest.Mock;
    let dismiss: jest.Mock;

    const render = (data: PageHelpSheetData): HTMLElement => {
        sendEvent = jest.fn();
        dismiss = jest.fn();
        TestBed.configureTestingModule({
            imports: [PageHelpSheetComponent],
            providers: [
                provideRouter([{ path: '**', children: [] }]),
                { provide: MAT_BOTTOM_SHEET_DATA, useValue: data },
                { provide: MatBottomSheetRef, useValue: { dismiss } },
                { provide: GoogleAnalyticsService, useValue: { sendEvent } },
            ],
        });
        const fixture = TestBed.createComponent(PageHelpSheetComponent);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    };

    const heading = (el: HTMLElement) =>
        el.querySelector('h2')?.textContent?.trim();
    const lines = (el: HTMLElement) =>
        Array.from(el.querySelectorAll('[data-help-line]')).map((e) =>
            e.textContent?.trim(),
        );
    const links = (el: HTMLElement) =>
        Array.from(el.querySelectorAll<HTMLAnchorElement>('a[href]'));

    it('ページ名があれば「（ページ名）の見方」と、そのページの説明を出す', () => {
        const el = render({
            pageTitle: 'リアルタイム運用情報',
            path: '/operation/real-time',
        });
        expect(heading(el)).toBe('リアルタイム運用情報の見方');
        expect(lines(el)).toEqual(findPageHelp('/operation/real-time')?.lines);
    });

    it('説明の無いページでは、サイトの一言説明と 2 つのリンクだけを出す', () => {
        const el = render({ pageTitle: 'ログイン', path: '/login' });
        expect(lines(el)).toEqual([SITE_INTRO]);
        expect(links(el).map((a) => a.getAttribute('href'))).toEqual([
            '/guide',
            '/glossary',
        ]);
    });

    it('ページ名が無ければ「Sotetsu Lab. の見方」で、トップの説明を出す', () => {
        const el = render({ pageTitle: '', path: '/' });
        expect(heading(el)).toBe('Sotetsu Lab. の見方');
        expect(lines(el)).toEqual(findPageHelp('/')?.lines);
    });

    it('投稿者ページでは help_link に投稿者の id を送らない', () => {
        const el = render({
            pageTitle: '投稿者',
            path: '/moderation/users/abc-123',
        });
        links(el)
            .find((a) => a.getAttribute('href') === '/guide')
            ?.click();
        expect(sendEvent).toHaveBeenCalledWith('help_link', {
            page: '/moderation/users/:userId',
            to: '/guide',
        });
    });

    it('用語集のリンクを押すと help_link を送り、シートを閉じる', () => {
        const el = render({
            pageTitle: 'リアルタイム運用情報',
            path: '/operation/real-time',
        });
        const glossary = links(el).find(
            (a) => a.getAttribute('href') === '/glossary',
        );
        glossary?.click();
        expect(sendEvent).toHaveBeenCalledWith('help_link', {
            page: '/operation/real-time',
            to: '/glossary',
        });
        expect(dismiss).toHaveBeenCalled();
    });
});
