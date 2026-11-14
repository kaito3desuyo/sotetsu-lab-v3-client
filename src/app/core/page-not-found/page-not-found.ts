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

    mark(): void {
        this.#response.setStatus(404);
        this.#response.setCachePolicy('short');
        this.#pageMeta.setTitle(PageNotFound.title);
    }
}
