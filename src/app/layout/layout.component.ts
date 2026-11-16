import { LiveAnnouncer } from '@angular/cdk/a11y';
import { BreakpointObserver } from '@angular/cdk/layout';
import { isPlatformBrowser } from '@angular/common';
import {
    afterNextRender,
    Component,
    ElementRef,
    computed,
    inject,
    Injector,
    PLATFORM_ID,
    signal,
    viewChild,
    ChangeDetectionStrategy,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import {
    takeUntilDestroyed,
    toObservable,
    toSignal,
} from '@angular/core/rxjs-interop';
import {
    ActivatedRouteSnapshot,
    NavigationCancel,
    NavigationEnd,
    Router,
    RouterModule,
} from '@angular/router';
import { filter, map, tap } from 'rxjs/operators';
import {
    focusMainContent,
    routePathKey,
} from '../core/a11y/focus-main-content';
import { PageNotFound } from '../core/page-not-found/page-not-found';
import { wait } from '../core/utils/wait';
import { layoutAnimations } from './animations/layout.animation';
import { HeaderComponent } from './components/header/header.component';
import { SidenavComponent } from './components/sidenav/sidenav.component';

/** ナビを常設のレールにする幅（Tailwind の lg と同じ） */
const RAIL_QUERY = '(min-width: 1024px)';

@Component({
    selector: 'app-layout',
    templateUrl: './layout.component.html',
    animations: layoutAnimations,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterModule, HeaderComponent, SidenavComponent],
    host: {
        '(document:keydown.escape)': 'onEscape($event)',
    },
})
export class LayoutComponent {
    readonly #router = inject(Router);
    readonly #injector = inject(Injector);
    readonly #title = inject(Title);
    readonly #liveAnnouncer = inject(LiveAnnouncer);
    readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    /**
     * 直前に処理したページの path（matrix・query を除く）。null は「まだ最初の移動を見ていない」。
     * 初回ナビゲーションは本コンポーネントの生成前に済むことが多いので、済んでいれば今の URL を入れておく。
     */
    #lastPathKey: string | null = this.#router.navigated
        ? routePathKey(this.#router.parseUrl(this.#router.url))
        : null;

    private readonly contentRef = viewChild<unknown, ElementRef<HTMLElement>>(
        'content',
        { read: ElementRef },
    );

    private readonly headerRef = viewChild(HeaderComponent);
    private readonly sidenavRef = viewChild<unknown, ElementRef<HTMLElement>>(
        'sidenav',
        { read: ElementRef },
    );
    readonly #pageNotFound = inject(PageNotFound);

    readonly isOpen = signal<boolean>(false);
    readonly isVisibled = signal<boolean>(false);

    /**
     * lg（1024px）以上か。lg 以上ではナビを常設のレールにする（docs/design.md「Navigation」）。
     * レールを出す・畳むは CSS（data-rail と lg: の規則）が決めるので、サーバーの HTML でも
     * 最初から出ている。この値は inert・aria-expanded・ハンバーガーの動きを切り替えるのに使う
     */
    readonly isRail = toSignal(
        inject(BreakpointObserver)
            .observe(RAIL_QUERY)
            .pipe(map((state) => state.matches)),
        { initialValue: false },
    );

    /** lg 以上でレールを畳んでいるか。保存しない（畳んだ状態をサーバーの HTML に出せず、開いた後で動くため） */
    readonly railCollapsed = signal<boolean>(false);

    /** ナビが見えていて操作できるか。lg 以上はレール、未満は重ねて開くドロワー */
    readonly navShown = computed(() =>
        this.isRail() ? !this.railCollapsed() : this.isOpen(),
    );

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
    readonly #routeTitle = toSignal(
        this.#router.events.pipe(
            filter((ev) => ev instanceof NavigationEnd),
            map(() => this.#currentRouteTitle()),
        ),
        { initialValue: this.#currentRouteTitle() },
    );

    /** 見つからない表示のときは、ルートの題名でなく PageNotFound.title を出す */
    readonly pageTitle = computed(() =>
        this.#pageNotFound.active() ? PageNotFound.title : this.#routeTitle(),
    );

    constructor() {
        // ドロワーを開いたまま lg 以上に広げたら、重ねたドロワーと背景を片付ける
        toObservable(this.isRail)
            .pipe(
                filter((isRail) => isRail && this.isVisibled()),
                takeUntilDestroyed(),
            )
            .subscribe(() => {
                this.isOpen.set(false);
                this.isVisibled.set(false);
            });

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

        this.#router.events
            .pipe(
                filter((ev) => ev instanceof NavigationEnd),
                takeUntilDestroyed(),
            )
            .subscribe((ev) => {
                this.#onPageChanged(ev.urlAfterRedirects);
            });
    }

    /** 「本文へ移動」: URL は変えず、本文の main にフォーカスする */
    onSkipToMain(event: Event): void {
        event.preventDefault();
        this.#focusMain();
    }

    async toggle(): Promise<void> {
        if (this.isRail()) {
            this.railCollapsed.update((collapsed) => !collapsed);
            return;
        }
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

        if (reason === 'navigation' && this.#isBrowser) {
            // 閉じる（inert になる）とサイドナビの中のフォーカスは行き場を失うので、描画のあとで本文へ移す
            afterNextRender(() => this.#rescueFocus(), {
                injector: this.#injector,
            });
        }

        await this.#hide();
    }

    /** 開いているときだけ Esc で閉じる（閉じているときはダイアログなどの Esc を邪魔しない） */
    onEscape(event: Event): void {
        // セレクト・ダイアログ・シートが Esc を処理済み（preventDefault）なら、サイドナビは閉じない
        if (event.defaultPrevented) {
            return;
        }
        if (this.isOpen()) {
            void this.close('escape');
        }
    }

    async #hide(): Promise<void> {
        this.isOpen.set(false);
        await wait(250);
        this.isVisibled.set(false);
    }

    /** フォーカスがサイドナビの中か body にあれば、本文の main へ（無ければハンバーガーへ）移す */
    #rescueFocus(): void {
        const active = document.activeElement;
        const inSidenav =
            !!active && !!this.sidenavRef()?.nativeElement.contains(active);
        if (active && active !== document.body && !inSidenav) {
            return;
        }
        if (!this.#focusMain()) {
            this.headerRef()?.focusMenuButton();
        }
    }

    #focusMain(): boolean {
        const content = this.contentRef()?.nativeElement;
        return !!content && focusMainContent(content);
    }

    /**
     * ページを移った（path が変わった）ときだけ、本文へフォーカスして題を読み上げる。
     * 操作帯の選び直し（matrix・query だけの変化）では動かさない。
     */
    #onPageChanged(url: string): void {
        const key = routePathKey(this.#router.parseUrl(url));
        const previous = this.#lastPathKey;
        this.#lastPathKey = key;

        if (previous === null || previous === key || !this.#isBrowser) {
            return;
        }

        afterNextRender(
            () => {
                this.#focusMain();
                void this.#liveAnnouncer.announce(
                    this.#title.getTitle(),
                    'polite',
                );
            },
            { injector: this.#injector },
        );
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
