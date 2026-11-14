import { inject, Injectable } from '@angular/core';
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

    /**
     * route の pageResolver が PageMeta.set した後に呼ぶこと。
     * 見つからない間は、ページの題名の effect が動かないようにすること（題名を上書きしてしまう）。
     * 見つかる状態へ戻ったら clear() を呼ぶこと（呼ばないと、同じルートの resolver が見つからない題名を戻してしまう）。
     */
    mark(): void {
        this.#response.setStatus(404);
        this.#response.setCachePolicy('short');
        this.#pageMeta.setTitle(PageNotFound.title);
    }

    /** 見つからない状態から戻ったとき。見つからない題名を捨て、ルート定義の題名に戻す */
    clear(): void {
        this.#pageMeta.clearDetailedTitle();
    }
}
