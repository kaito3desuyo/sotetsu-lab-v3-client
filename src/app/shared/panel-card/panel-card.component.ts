import {
    ChangeDetectionStrategy,
    Component,
    inject,
    InjectionToken,
    input,
    Provider,
} from '@angular/core';

/**
 * true を provide すると、配下の app-panel-card は外枠（白地・角丸・余白）と
 * 見出しを出さず中身だけを描く。アコーディオンのように、見出しと面を
 * 外側がすでに持っている場所で使う。
 */
export const PANEL_CARD_EMBEDDED = new InjectionToken<boolean>(
    'PANEL_CARD_EMBEDDED',
);

/** 配下の app-panel-card を埋め込み表示にする provider。 */
export function providePanelCardEmbedded(): Provider {
    return { provide: PANEL_CARD_EMBEDDED, useValue: true };
}

/**
 * 操作カード（運用情報を検索する / 投稿する・時刻表を検索する / 投稿する・
 * ライブラリ）の共通の外枠。
 *
 * - 単独配置: ダッシュボード「最新の目撃情報」と同じ白いカードに、16px 太字の
 *   小見出し 1 行（docs/design.md 面の掟）
 * - 埋め込み（PANEL_CARD_EMBEDDED）: 外枠・見出し・余白を持たない。
 *   以前はアコーディオンのパネル見出しの下にカード自身の 24px 見出しと
 *   説明文がもう一度出て、余白も二重（パネル 24px + カード 16px）だった
 *
 * 行の端まで伸ばす部品（一覧の行など）のために、中身の左右の余白を
 * `--panel-card-inset` で公開する（単独 16px / 埋め込み 24px = パネル本体の余白）。
 */
@Component({
    selector: 'app-panel-card',
    // <ng-content> を @if の両分岐に置くと片方にしか投影されないので、
    // ラッパーは 1 つにしてクラスだけ切り替える。
    // 中身のまとまり同士は 16px、見出しから中身までは 8px（負のマージンで詰める）。
    template: `
        <section [class]="sectionClass">
            @if (!embedded) {
                <h2
                    class="tw-m-0 -tw-mb-2 tw-text-base tw-font-bold tw-text-ink"
                >
                    {{ heading() }}
                </h2>
            }
            <ng-content></ng-content>
        </section>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'tw-block',
        '[style.--panel-card-inset]': 'embedded ? "24px" : "16px"',
    },
})
export class PanelCardComponent {
    readonly heading = input.required<string>();

    readonly embedded =
        inject(PANEL_CARD_EMBEDDED, { optional: true }) ?? false;

    readonly sectionClass = this.embedded
        ? 'tw-flex tw-flex-col tw-gap-4'
        : 'tw-box-border tw-flex tw-h-full tw-flex-col tw-gap-4 tw-rounded-card tw-bg-white tw-p-4';
}
