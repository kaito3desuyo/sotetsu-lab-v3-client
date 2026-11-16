import {
    effect,
    linkedSignal,
    Signal,
    computed,
    untracked,
} from '@angular/core';

/**
 * 長い一覧を一度に描かず、step 件ずつ画面の更新（requestAnimationFrame）ごとに足して描く。
 * 絞り込みを外して 100 枚を超えるカードを一度に作ると、1 つの長いタスクになって操作が止まるため
 * （リアルタイムで 0.7 秒・2026-11-16 実測）。
 *
 * - 作った時点の一覧は全部を一度に描く（スクロール位置の復元のため）
 * - あとで一覧が増えたときは、描いていた件数（最低 step 件）から足していく
 * - 中身が入れ替わっただけ（自動更新など）なら、描いていた件数を保つ（描き直さない）
 * - requestAnimationFrame の無い所（サーバー・テストの一部）では全部を一度に返す
 *
 * 注入の文脈（コンポーネントのフィールドの初期化など）で呼ぶ。
 */
export function renderInSteps<T>(
    items: Signal<readonly T[]>,
    step = 24,
): Signal<readonly T[]> {
    const canStep = typeof requestAnimationFrame === 'function';
    const limit = linkedSignal<readonly T[], number>({
        source: items,
        // 作った時点で手元にある一覧（戻るボタンで来たときなど）は全部を描く。
        // 段階で描くと、Router がスクロール位置を戻す時点でページが短く、元の位置に戻れない
        computation: (next, previous) =>
            previous === undefined
                ? next.length
                : Math.max(step, Math.min(previous.value, next.length)),
    });

    // linkedSignal は読まれるまで計算しないので、作った時点の一覧で一度計算しておく
    untracked(limit);

    if (canStep) {
        effect((onCleanup) => {
            const total = items().length;
            const current = limit();
            if (current >= total) return;
            const id = requestAnimationFrame(() =>
                untracked(() => limit.set(current + step)),
            );
            onCleanup(() => cancelAnimationFrame(id));
        });
    }

    return computed(() => {
        const all = items();
        return canStep ? all.slice(0, limit()) : all;
    });
}
