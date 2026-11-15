import { inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { PageMeta } from '../ssr/page-meta';
import { SsrResponse } from '../ssr/ssr-response';

/**
 * ページが「見つからない」と決めたときに呼ぶ係。
 * サーバーでは状態コードを 404 にして短いキャッシュにし、題名を見つからないページと同じにする。
 * ブラウザでは題名だけが効く。
 */
@Injectable({ providedIn: 'root' })
export class PageNotFound {
    /** pages/not-found のルートの題名もこれを使う（文言を 2 か所に書かない） */
    static readonly title = 'ページが見つかりません';

    readonly #response = inject(SsrResponse);
    readonly #pageMeta = inject(PageMeta);
    readonly #active = signal(false);

    /** 見つからない表示の間 true。layout のヘッダーの見出しがこれを読む */
    readonly active = this.#active.asReadonly();

    readonly #router = inject(Router);
    /** mark() を呼んだときの primary の path（matrix・query・fragment を除く） */
    #markedPath: string | null = null;

    constructor() {
        // 別の path のページへ移り終えたら、見つからない状態を捨てる（ヘッダーの見出しを残さない）。
        // 同じ path の matrix・query だけの移動、取り消し・失敗した移動では触らない。
        // 移った先で見つからないと決めるなら、その resolver・コンポーネントが改めて mark() を呼ぶ。
        this.#router.events
            .pipe(
                filter((ev) => ev instanceof NavigationEnd),
                takeUntilDestroyed(),
            )
            .subscribe((ev) => {
                if (
                    this.#active() &&
                    this.#pathOf(ev.urlAfterRedirects) !== this.#markedPath
                ) {
                    this.#active.set(false);
                }
            });
    }

    /**
     * route の pageResolver が PageMeta.set した後に呼ぶこと。
     * 見つからない間は、ページの題名の effect が動かないようにすること（題名を上書きしてしまう）。
     * 見つかる状態へ戻ったら clear() を呼ぶこと（呼ばないと、同じルートの resolver が見つからない題名を戻してしまう）。
     */
    mark(): void {
        // resolver の中では遷移中の URL、移り終えた後のコンポーネントからは現在の URL
        const nav = this.#router.currentNavigation();
        this.#markedPath = this.#pathOf(
            nav
                ? this.#router.serializeUrl(nav.finalUrl ?? nav.extractedUrl)
                : this.#router.url,
        );
        this.#active.set(true);
        this.#response.setStatus(404);
        this.#response.setCachePolicy('short');
        this.#pageMeta.setTitle(PageNotFound.title);
    }

    /** 見つからない状態から戻ったとき。見つからない題名を捨て、ルート定義の題名に戻す */
    clear(): void {
        this.#active.set(false);
        this.#pageMeta.clearDetailedTitle();
    }

    #pathOf(url: string): string {
        const primary = this.#router.parseUrl(url).root.children['primary'];
        return primary?.segments.map((segment) => segment.path).join('/') ?? '';
    }
}
