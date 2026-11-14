import {
    afterNextRender,
    Component,
    ElementRef,
    inject,
    Injector,
    signal,
    viewChild,
    ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
    ActivatedRouteSnapshot,
    NavigationCancel,
    NavigationEnd,
    Router,
    RouterModule,
} from '@angular/router';
import { filter, map, tap } from 'rxjs/operators';
import { wait } from '../core/utils/wait';
import { layoutAnimations } from './animations/layout.animation';
import { HeaderComponent } from './components/header/header.component';
import { SidenavComponent } from './components/sidenav/sidenav.component';

@Component({
    selector: 'app-layout',
    templateUrl: './layout.component.html',
    animations: layoutAnimations,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterModule, HeaderComponent, SidenavComponent],
    host: {
        '(document:keydown.escape)': 'onEscape()',
    },
})
export class LayoutComponent {
    readonly #router = inject(Router);
    readonly #injector = inject(Injector);

    private readonly headerRef = viewChild(HeaderComponent);
    private readonly sidenavRef = viewChild<unknown, ElementRef<HTMLElement>>(
        'sidenav',
        { read: ElementRef },
    );

    readonly isOpen = signal<boolean>(false);
    readonly isVisibled = signal<boolean>(false);

    /**
     * R-6: prefers-reduced-motion 環境ではサイドナビ開閉のトランジション
     * （@openClose, layout.animation.ts）を無効化する。[@.disabled] にバインドして
     * Angular Animations 側で即時反映に切り替える（グローバルの動きは他に無いため対象はこれのみ）。
     */
    readonly prefersReducedMotion: boolean =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /**
     * 現在ルートのページ名（Route data の title）。ツールバーに表示する。
     * ホーム（dashboard）等 title を持たないルートでは空文字になり、
     * ヘッダー側でロゴ表示（Sotetsu Lab.）へフォールバックする。
     *
     * withEnabledBlockingInitialNavigation により初回ナビゲーションは
     * 本コンポーネント生成前に完了しているため、初期値も snapshot から引く。
     */
    readonly pageTitle = toSignal(
        this.#router.events.pipe(
            filter((ev) => ev instanceof NavigationEnd),
            map(() => this.#currentRouteTitle()),
        ),
        { initialValue: this.#currentRouteTitle() },
    );

    constructor() {
        this.#router.events
            .pipe(
                filter(
                    (ev) =>
                        !!this.isVisibled() &&
                        (ev instanceof NavigationEnd ||
                            ev instanceof NavigationCancel),
                ),
                tap(() => {
                    void this.close('navigation');
                }),
                takeUntilDestroyed(),
            )
            .subscribe();
    }

    async toggle(): Promise<void> {
        const next = !this.isVisibled();

        if (!!next) {
            this.isVisibled.set(next);
            await wait(0);
            this.isOpen.set(next);
            // inert が外れる描画のあとで、サイドナビの先頭へフォーカスを移す
            afterNextRender(() => this.#focusFirstInSidenav(), {
                injector: this.#injector,
            });
        } else {
            await this.#hide();
        }
    }

    /**
     * サイドナビを閉じる。Esc・背景のクリックで閉じたときは開いたボタンへフォーカスを戻す。
     * ページ移動（navigation）で閉じたときは戻さない（移動後のフォーカスは本文が受ける）。
     */
    async close(reason: 'escape' | 'backdrop' | 'navigation'): Promise<void> {
        if (!this.isVisibled()) {
            return;
        }

        if (reason !== 'navigation') {
            this.headerRef()?.focusMenuButton();
        }

        await this.#hide();
    }

    /** 開いているときだけ Esc で閉じる（閉じているときはダイアログなどの Esc を邪魔しない） */
    onEscape(): void {
        if (this.isOpen()) {
            void this.close('escape');
        }
    }

    async #hide(): Promise<void> {
        this.isOpen.set(false);
        await wait(250);
        this.isVisibled.set(false);
    }

    #focusFirstInSidenav(): void {
        const target =
            this.sidenavRef()?.nativeElement.querySelector<HTMLElement>(
                'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            );
        target?.focus({ preventScroll: true });
    }

    /** ルートツリーを末端まで辿り、最も深い Route data.title を返す。 */
    #currentRouteTitle(): string {
        let snapshot: ActivatedRouteSnapshot | null =
            this.#router.routerState.snapshot.root;
        let title = '';

        while (snapshot) {
            const dataTitle: unknown = snapshot.data?.['title'];
            if (typeof dataTitle === 'string' && dataTitle) {
                title = dataTitle;
            }
            snapshot = snapshot.firstChild;
        }

        return title;
    }
}
