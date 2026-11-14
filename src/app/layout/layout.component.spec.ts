import '@testing-library/jest-dom';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { Router, RouterModule, provideRouter } from '@angular/router';
import { GoogleAnalyticsService } from 'src/app/core/services/google-analytics.service';

import { HeaderComponent } from './components/header/header.component';
import { LayoutComponent } from './layout.component';

@Component({ changeDetection: ChangeDetectionStrategy.OnPush, template: '' })
class DummyComponent {}

@Component({
    selector: 'app-sidenav',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: '<nav><a href="/">TOP</a><a href="/x">X</a></nav>',
})
class StubSidenavComponent {}

const press = (key: string): void => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key }));
};

describe('LayoutComponent', () => {
    let component: LayoutComponent;
    let fixture: ComponentFixture<LayoutComponent>;
    let router: Router;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [LayoutComponent],
            providers: [
                provideHttpClient(withXhr()),
                provideAnimations(),
                {
                    provide: GoogleAnalyticsService,
                    useValue: { sendEvent: jest.fn() },
                },
                provideRouter([
                    {
                        path: '',
                        component: DummyComponent,
                    },
                    {
                        path: 'train-diagram',
                        component: DummyComponent,
                        data: { title: 'ダイヤグラム' },
                    },
                ]),
            ],
        })
            .overrideComponent(LayoutComponent, {
                set: {
                    imports: [
                        RouterModule,
                        HeaderComponent,
                        StubSidenavComponent,
                    ],
                },
            })
            .compileComponents();

        router = TestBed.inject(Router);
        fixture = TestBed.createComponent(LayoutComponent);
        // フォーカスを見るので document に付ける
        document.body.appendChild(fixture.nativeElement);
        component = fixture.componentInstance;
    });

    afterEach(() => {
        fixture.nativeElement.remove();
    });

    const sidenav = (): HTMLElement =>
        fixture.nativeElement.querySelector('app-sidenav');
    const menuButton = (): HTMLButtonElement =>
        fixture.nativeElement.querySelector('app-header header button');

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('pageTitle: Route data の title を反映する', async () => {
        await router.navigate(['/train-diagram']);
        expect(component.pageTitle()).toBe('ダイヤグラム');
    });

    it('pageTitle: title を持たないルート（ホーム等）では空文字になる', async () => {
        await router.navigate(['/train-diagram']);
        await router.navigate(['/']);
        expect(component.pageTitle()).toBe('');
    });

    describe('サイドナビの開閉', () => {
        it('閉じている間は inert で、開くと外れる', async () => {
            fixture.detectChanges();
            expect(sidenav().id).toBe('app-sidenav');
            expect(sidenav()).toHaveAttribute('inert');

            await component.toggle();
            fixture.detectChanges();
            expect(sidenav()).not.toHaveAttribute('inert');
        });

        it('ハンバーガーは aria-controls と aria-expanded で開閉を伝える', async () => {
            fixture.detectChanges();
            expect(menuButton()).toHaveAttribute('aria-label', 'メニュー');
            expect(menuButton()).toHaveAttribute(
                'aria-controls',
                'app-sidenav',
            );
            expect(menuButton()).toHaveAttribute('aria-expanded', 'false');

            await component.toggle();
            fixture.detectChanges();
            expect(menuButton()).toHaveAttribute('aria-expanded', 'true');
        });

        it('開くと、サイドナビの最初のリンクにフォーカスが移る', async () => {
            fixture.detectChanges();
            await component.toggle();
            fixture.detectChanges();
            await fixture.whenStable();

            expect(document.activeElement).toBe(sidenav().querySelector('a'));
        });

        it('Esc で閉じ、フォーカスがハンバーガーに戻る', async () => {
            fixture.detectChanges();
            await component.toggle();
            fixture.detectChanges();

            press('Escape');
            expect(component.isOpen()).toBe(false);
            expect(document.activeElement).toBe(menuButton());
        });

        it('閉じているときの Esc は何もしない', () => {
            fixture.detectChanges();
            const toggle = jest.spyOn(component, 'toggle');
            const close = jest.spyOn(component, 'close');

            press('Escape');

            expect(toggle).not.toHaveBeenCalled();
            expect(close).not.toHaveBeenCalled();
            expect(document.activeElement).not.toBe(menuButton());
        });

        it('背景のクリックで閉じ、フォーカスがハンバーガーに戻る', async () => {
            fixture.detectChanges();
            await component.toggle();
            fixture.detectChanges();

            const backdrop: HTMLElement = fixture.nativeElement.querySelector(
                'div.tw-fixed.tw-z-10',
            );
            backdrop.click();

            expect(component.isOpen()).toBe(false);
            expect(document.activeElement).toBe(menuButton());
        });

        it('NavigationEnd で閉じたときは、ハンバーガーにフォーカスを戻さない', async () => {
            fixture.detectChanges();
            await component.toggle();
            fixture.detectChanges();
            await fixture.whenStable();
            const link = sidenav().querySelector('a');
            expect(document.activeElement).toBe(link);

            await router.navigate(['/train-diagram']);

            expect(component.isOpen()).toBe(false);
            expect(document.activeElement).not.toBe(menuButton());
        });
    });
});
