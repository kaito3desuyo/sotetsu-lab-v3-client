import {
    Component,
    inject,
    signal,
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
    styleUrls: ['./layout.component.scss'],
    animations: layoutAnimations,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterModule, HeaderComponent, SidenavComponent],
})
export class LayoutComponent {
    readonly #router = inject(Router);

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
                    this.toggle();
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
        } else {
            this.isOpen.set(next);
            await wait(250);
            this.isVisibled.set(next);
        }
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
