import '@testing-library/jest-dom';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { provideRouter, Router } from '@angular/router';
import { GoogleAnalyticsService } from 'src/app/core/services/google-analytics.service';
import { PageHelpSheetComponent } from 'src/app/layout/page-help/page-help-sheet.component';
import { UserState } from 'src/app/global-states/user.state';

import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
    let component: HeaderComponent;
    let fixture: ComponentFixture<HeaderComponent>;
    let router: Router;
    let open: jest.Mock;
    let sendEvent: jest.Mock;

    beforeEach(async () => {
        open = jest.fn();
        sendEvent = jest.fn();
        await TestBed.configureTestingModule({
            imports: [HeaderComponent],
            providers: [
                provideHttpClient(withXhr()),
                provideRouter([]),
                { provide: MatBottomSheet, useValue: { open } },
                { provide: GoogleAnalyticsService, useValue: { sendEvent } },
            ],
        }).compileComponents();

        router = TestBed.inject(Router);
        fixture = TestBed.createComponent(HeaderComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('「?」（このページの見方）はアカウントのボタンより前にある', () => {
        fixture.detectChanges();

        const buttons: HTMLButtonElement[] = Array.from(
            fixture.nativeElement.querySelectorAll('header button'),
        );
        const labels = buttons.map((b) => b.getAttribute('aria-label'));
        const help = labels.indexOf('このページの見方');
        expect(help).toBeGreaterThanOrEqual(0);
        expect(help).toBeLessThan(labels.indexOf('アカウントメニューを開く'));
    });

    it('「?」を押すと、パスの型でシートを開き help_open を送る', () => {
        jest.spyOn(router, 'url', 'get').mockReturnValue(
            '/operation/table;calendar_id=x',
        );
        fixture.componentRef.setInput('pageTitle', '運用表');
        fixture.detectChanges();

        const help: HTMLButtonElement = fixture.nativeElement.querySelector(
            'header button[aria-label="このページの見方"]',
        );
        help.click();

        expect(open).toHaveBeenCalledWith(PageHelpSheetComponent, {
            data: { pageTitle: '運用表', path: '/operation/table' },
        });
        expect(sendEvent).toHaveBeenCalledWith('help_open', {
            page: '/operation/table',
        });
    });

    it('投稿者ページでは help_open に投稿者の id を送らない', () => {
        jest.spyOn(router, 'url', 'get').mockReturnValue(
            '/moderation/users/abc-123',
        );
        fixture.detectChanges();

        (
            fixture.nativeElement.querySelector(
                'header button[aria-label="このページの見方"]',
            ) as HTMLButtonElement
        ).click();

        expect(sendEvent).toHaveBeenCalledWith('help_open', {
            page: '/moderation/users/:userId',
        });
    });

    it('pageTitle 未指定時はロゴ表記「Sotetsu Lab.」を表示する', () => {
        fixture.detectChanges();

        const h1: HTMLElement = fixture.nativeElement.querySelector('h1');
        expect(h1.textContent?.trim()).toBe('Sotetsu Lab.');
    });

    it('pageTitle 指定時はツールバーにページ名を表示する', () => {
        fixture.componentRef.setInput('pageTitle', 'ダイヤグラム');
        fixture.detectChanges();

        const h1: HTMLElement = fixture.nativeElement.querySelector('h1');
        expect(h1.textContent?.trim()).toBe('ダイヤグラム');
        expect(fixture.nativeElement).not.toHaveTextContent(/Sotetsu Lab\./);
    });

    it('P8-6: リロードアイコンは表示しない（「ようこそ」は維持する）', () => {
        fixture.detectChanges();

        expect(fixture.nativeElement).toHaveTextContent('ようこそ');

        const icons: HTMLElement[] = Array.from(
            fixture.nativeElement.querySelectorAll('mat-icon'),
        );
        const iconNames = icons.map((icon) => icon.textContent?.trim());
        expect(iconNames).not.toContain('refresh');
    });

    it('ログイン中は名前が /my-page へのリンク', () => {
        patchState(unprotected(TestBed.inject(UserState)), {
            userId: 'u1',
            displayName: '相鉄太郎',
        });
        fixture.detectChanges();

        const link: HTMLAnchorElement | null =
            fixture.nativeElement.querySelector('header a[href="/my-page"]');
        expect(link?.textContent?.trim()).toBe('相鉄太郎');
        expect(link).toHaveClass('[color:inherit]', 'tw-underline');
        expect(fixture.nativeElement.querySelector('header')).toHaveTextContent(
            /ようこそ\s*相鉄太郎 さん/,
        );
    });

    it('viewer は名前をリンクにしない（マイページには入れない）', () => {
        patchState(unprotected(TestBed.inject(UserState)), {
            userId: 'u2',
            displayName: '閲覧太郎',
            role: 'viewer',
        });
        fixture.detectChanges();

        const header: HTMLElement =
            fixture.nativeElement.querySelector('header');
        expect(header.querySelector('a[href="/my-page"]')).toBeNull();
        expect(header).toHaveTextContent(/ようこそ\s*閲覧太郎\s*さん/);
    });

    it('ゲストの「ゲスト さん」はリンクにしない', () => {
        fixture.detectChanges();

        const header: HTMLElement =
            fixture.nativeElement.querySelector('header');
        expect(header.querySelector('a')).toBeNull();
        expect(header).toHaveTextContent(/ゲスト さん/);
    });

    it('新規登録は、今のページを return_to にして /register へ移る', () => {
        const navigate = jest.spyOn(router, 'navigate').mockResolvedValue(true);
        jest.spyOn(router, 'url', 'get').mockReturnValue('/timetable?a=1');

        component.onClickRegister();

        expect(navigate).toHaveBeenCalledWith(['/register'], {
            queryParams: { return_to: '/timetable?a=1' },
        });
    });

    it('ログインは、今のページを return_to にして /login へ移る', () => {
        const navigate = jest.spyOn(router, 'navigate').mockResolvedValue(true);
        jest.spyOn(router, 'url', 'get').mockReturnValue('/operation');

        component.onClickLogin();

        expect(navigate).toHaveBeenCalledWith(['/login'], {
            queryParams: { return_to: '/operation' },
        });
    });

    it('ログイン・登録のページ自身からは return_to を / にする', () => {
        const navigate = jest.spyOn(router, 'navigate').mockResolvedValue(true);
        jest.spyOn(router, 'url', 'get').mockReturnValue(
            '/login?return_to=%2F',
        );

        component.onClickLogin();

        expect(navigate).toHaveBeenCalledWith(['/login'], {
            queryParams: { return_to: '/' },
        });
    });
    it('/login にいるときは、その return_to を引き継いで /register へ移る', () => {
        const navigate = jest.spyOn(router, 'navigate').mockResolvedValue(true);
        jest.spyOn(router, 'url', 'get').mockReturnValue(
            '/login?return_to=%2Ftimetable%2Fall-line',
        );

        component.onClickRegister();

        expect(navigate).toHaveBeenCalledWith(['/register'], {
            queryParams: { return_to: '/timetable/all-line' },
        });
    });

    it('/register にいるときは、その return_to を引き継いで /login へ移る', () => {
        const navigate = jest.spyOn(router, 'navigate').mockResolvedValue(true);
        jest.spyOn(router, 'url', 'get').mockReturnValue(
            '/register?return_to=%2Foperation',
        );

        component.onClickLogin();

        expect(navigate).toHaveBeenCalledWith(['/login'], {
            queryParams: { return_to: '/operation' },
        });
    });

    it('引き継ぐ return_to が危ない値なら / にする', () => {
        const navigate = jest.spyOn(router, 'navigate').mockResolvedValue(true);
        jest.spyOn(router, 'url', 'get').mockReturnValue(
            '/login?return_to=%2F%2Fevil.example',
        );

        component.onClickRegister();

        expect(navigate).toHaveBeenCalledWith(['/register'], {
            queryParams: { return_to: '/' },
        });
    });
});

describe('HeaderComponent をサーバーで描くとき', () => {
    it('ログインしていてもゲストの挨拶を出す（CDN で別の人に配られるため）', async () => {
        await TestBed.configureTestingModule({
            imports: [HeaderComponent],
            providers: [
                provideHttpClient(withXhr()),
                { provide: PLATFORM_ID, useValue: 'server' },
                {
                    provide: GoogleAnalyticsService,
                    useValue: { sendEvent: jest.fn() },
                },
            ],
        }).compileComponents();
        patchState(unprotected(TestBed.inject(UserState)), {
            userId: 'u1',
            displayName: '相鉄太郎',
        });

        const fixture = TestBed.createComponent(HeaderComponent);
        fixture.detectChanges();

        const header: HTMLElement =
            fixture.nativeElement.querySelector('header');
        expect(header).toHaveTextContent(/ゲスト さん/);
        expect(header).not.toHaveTextContent(/相鉄太郎/);
    });
});
