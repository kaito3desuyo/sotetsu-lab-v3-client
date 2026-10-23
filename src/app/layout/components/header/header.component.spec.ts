import '@testing-library/jest-dom';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { Router } from '@angular/router';

import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
    let component: HeaderComponent;
    let fixture: ComponentFixture<HeaderComponent>;
    let router: Router;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [HeaderComponent],
            providers: [provideHttpClient(withXhr())],
        }).compileComponents();

        router = TestBed.inject(Router);
        fixture = TestBed.createComponent(HeaderComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
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
});
