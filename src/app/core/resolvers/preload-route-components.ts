import type { ActivatedRouteSnapshot } from '@angular/router';

/**
 * 行き先のルートの loadComponent を先に呼び、ページの chunk を取り始める。
 * Angular の router は resolver が全部終わってから loadComponent を呼ぶので、
 * そのままだと起動時の取得を待ってから chunk を取りに行く（docs/adr/0008）。
 * import() はブラウザがモジュールを使い回すので、router が後で呼んでもすぐ返る。
 * 失敗は握りつぶし、エラーの扱いは router 自身の読み込みに任せる。
 */
export function preloadRouteComponents(
    snapshot: ActivatedRouteSnapshot | null | undefined,
): void {
    if (!snapshot) {
        return;
    }

    const loadComponent = snapshot.routeConfig?.loadComponent;
    if (loadComponent) {
        try {
            // Promise でない thenable が返っても拒否を握れるよう、Promise.resolve で取り込む
            Promise.resolve(loadComponent()).catch(() => undefined);
        } catch {
            // エラーの扱いは router 自身の読み込みに任せる
        }
    }

    for (const child of snapshot.children ?? []) {
        preloadRouteComponents(child);
    }
}
