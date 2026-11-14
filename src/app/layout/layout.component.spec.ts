import '@testing-library/jest-dom';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { Router, RouterModule, provideRouter } from '@angular/router';
import { GoogleAnalyticsService } from 'src/app/core/services/google-analytics.service';

import { HeaderComponent } from './components/header/header.component';
import { LayoutComponent } from './layout.component';

@Component({ changeDetection: ChangeDetectionStrategy.OnPush, template: '' })
class DummyComponent {}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: '<main>本文</main>',
})
class MainPageComponent {}

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
    let announce: jest.Mock;

    beforeEach(async () => {
        announce = jest.fn();
        await TestBed.configureTestingModule({
            imports: [LayoutComponent],
            providers: [
                { provide: LiveAnnouncer, useValue: { announce } },
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
                    { path: 'page-a', component: MainPageComponent },
                    { path: 'page-b', component: MainPageComponent },
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

            expect(sidenav().querySelector('a')).toHaveFocus();
        });

        it('Esc で閉じ、フォーカスがハンバーガーに戻る', async () => {
            fixture.detectChanges();
            await component.toggle();
            fixture.detectChanges();

            press('Escape');
            expect(component.isOpen()).toBe(false);
            expect(menuButton()).toHaveFocus();
        });

        it('閉じているときの Esc は何もしない', () => {
            fixture.detectChanges();
            const toggle = jest.spyOn(component, 'toggle');
            const close = jest.spyOn(component, 'close');

            press('Escape');

            expect(toggle).not.toHaveBeenCalled();
            expect(close).not.toHaveBeenCalled();
            expect(menuButton()).not.toHaveFocus();
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
            expect(menuButton()).toHaveFocus();
        });

        it('NavigationEnd で閉じたときは、ハンバーガーにフォーカスを戻さない', async () => {
            fixture.detectChanges();
            await component.toggle();
            fixture.detectChanges();
            await fixture.whenStable();
            const link = sidenav().querySelector('a');
            expect(link).toHaveFocus();

            await router.navigate(['/train-diagram']);

            expect(component.isOpen()).toBe(false);
            expect(menuButton()).not.toHaveFocus();
        });
    });

    describe('本文へ移動とページ移動後のフォーカス', () => {
        const main = (): HTMLElement =>
            fixture.nativeElement.querySelector('main');

        it('先頭（app-header より前）に「本文へ移動」のリンクがある', () => {
            fixture.detectChanges();
            const first = fixture.nativeElement.firstElementChild;

            expect(first.tagName).toBe('A');
            expect(first).toHaveTextContent(/本文へ移動/);
        });

        it('「本文へ移動」を押すと main にフォーカスが移り、URL は変わらない', async () => {
            fixture.detectChanges();
            await router.navigate(['/page-a']);
            fixture.detectChanges();
            const url = router.url;
            const link: HTMLAnchorElement =
                fixture.nativeElement.querySelector('a.app-skip-link');
            const event = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
            });

            link.dispatchEvent(event);

            expect(event.defaultPrevented).toBe(true);
            expect(main()).toHaveFocus();
            expect(main()).toHaveAttribute('tabindex', '-1');
            expect(router.url).toBe(url);
        });

        it('path が変わる NavigationEnd のあと main にフォーカスし、題を 1 回読み上げる', async () => {
            fixture.detectChanges();
            await router.navigate(['/page-a']); // 最初の移動
            fixture.detectChanges();
            announce.mockClear();
            TestBed.inject(Title).setTitle('移動先の題');

            await router.navigate(['/page-b']);
            fixture.detectChanges();
            await fixture.whenStable();

            expect(main()).toHaveFocus();
            expect(announce).toHaveBeenCalledTimes(1);
            expect(announce).toHaveBeenCalledWith('移動先の題', 'polite');
        });

        it('matrix だけが変わる移動ではフォーカスも読み上げも起きない', async () => {
            fixture.detectChanges();
            await router.navigate(['/page-a']);
            fixture.detectChanges();
            announce.mockClear();
            menuButton().focus();

            await router.navigateByUrl('/page-a;calendar_id=B');
            fixture.detectChanges();
            await fixture.whenStable();

            expect(menuButton()).toHaveFocus();
            expect(announce).not.toHaveBeenCalled();
        });

        it('最初の NavigationEnd では動かない', async () => {
            fixture.detectChanges();
            menuButton().focus();

            await router.navigate(['/page-a']);
            fixture.detectChanges();
            await fixture.whenStable();

            expect(menuButton()).toHaveFocus();
            expect(announce).not.toHaveBeenCalled();
        });
    });
});
