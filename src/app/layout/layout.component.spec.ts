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
import { PageNotFound } from '../core/page-not-found/page-not-found';
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
            await fixture.whenStable();
            expect(sidenav().querySelector('a')).toHaveFocus();

            press('Escape');
            expect(component.isOpen()).toBe(false);
            expect(menuButton()).toHaveFocus();
        });

        it('Esc が処理済み（preventDefault 済み。セレクトやダイアログ）なら閉じない', async () => {
            fixture.detectChanges();
            await component.toggle();
            fixture.detectChanges();
            await fixture.whenStable();

            const event = new KeyboardEvent('keydown', {
                key: 'Escape',
                cancelable: true,
            });
            event.preventDefault();
            document.dispatchEvent(event);

            expect(component.isOpen()).toBe(true);
            expect(sidenav().querySelector('a')).toHaveFocus();
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
            await fixture.whenStable();
            expect(sidenav().querySelector('a')).toHaveFocus();

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

        describe('サイドナビから移ったあとのフォーカス', () => {
            const openSidenavAndFocusLink = async (): Promise<void> => {
                await component.toggle();
                fixture.detectChanges();
                await fixture.whenStable();
                expect(sidenav().querySelector('a')).toHaveFocus();
            };

            it('path が同じで matrix だけ違う移動（上り⇄下り）でも、main に移る', async () => {
                fixture.detectChanges();
                await router.navigateByUrl('/page-a;x=1');
                fixture.detectChanges();
                await openSidenavAndFocusLink();

                await router.navigateByUrl('/page-a;x=2');
                fixture.detectChanges();
                await fixture.whenStable();

                expect(main()).toHaveFocus();
            });

            it('NavigationCancel で閉じたときも、サイドナビの中に残らず main に移る', async () => {
                fixture.detectChanges();
                await router.navigateByUrl('/page-a');
                fixture.detectChanges();
                await openSidenavAndFocusLink();
                const guarded = router.config;
                router.resetConfig([
                    ...guarded,
                    {
                        path: 'blocked',
                        component: MainPageComponent,
                        canActivate: [() => false],
                    },
                ]);

                await router.navigateByUrl('/blocked');
                fixture.detectChanges();
                await fixture.whenStable();

                expect(component.isOpen()).toBe(false);
                expect(main()).toHaveFocus();
            });

            it('main が無ければハンバーガーへ移す', async () => {
                fixture.detectChanges();
                await openSidenavAndFocusLink();

                await router.navigate(['/train-diagram']);
                fixture.detectChanges();
                await fixture.whenStable();

                expect(menuButton()).toHaveFocus();
            });
        });

        it('最初の表示（router.navigated が済み）では動かず、別の path への移動では動く', async () => {
            await router.navigate(['/page-a']);
            // beforeEach で作った分は購読が残るので壊してから、移動済みの状態で作り直す
            fixture.destroy();
            fixture = TestBed.createComponent(LayoutComponent);
            document.body.appendChild(fixture.nativeElement);
            fixture.detectChanges();
            await fixture.whenStable();
            menuButton().focus();
            announce.mockClear();

            await router.navigateByUrl('/page-a;calendar_id=B');
            fixture.detectChanges();
            await fixture.whenStable();
            expect(menuButton()).toHaveFocus();
            expect(announce).not.toHaveBeenCalled();

            await router.navigate(['/page-b']);
            fixture.detectChanges();
            await fixture.whenStable();
            expect(main()).toHaveFocus();
            expect(announce).toHaveBeenCalledTimes(1);
        });
    });

    it('pageTitle: 見つからない表示のときは PageNotFound.title になり、戻ると元の題名に戻る', async () => {
        await router.navigate(['/train-diagram']);
        const notFound = TestBed.inject(PageNotFound);

        notFound.mark();
        expect(component.pageTitle()).toBe(PageNotFound.title);

        notFound.clear();
        expect(component.pageTitle()).toBe('ダイヤグラム');
    });

    it('pageTitle: 見つからない表示から別のページへ移ると、見出しが残らない', async () => {
        await router.navigate(['/train-diagram']);
        TestBed.inject(PageNotFound).mark();

        await router.navigate(['/']);

        expect(component.pageTitle()).toBe('');
    });
});
