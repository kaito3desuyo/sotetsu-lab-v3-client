import {
    ChangeDetectionStrategy,
    Component,
    input,
    signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Tailwind 既定の sm ブレークポイント（640px）。折り畳みの初期状態判定に使う。 */
const SM_BREAKPOINT_QUERY = '(min-width: 640px)';

/**
 * sm（640px）以上のビューポートかどうか。
 * matchMedia が使えない環境（テスト等で未定義の場合）はデスクトップ扱いにする。
 */
export function isDesktopViewport(): boolean {
    if (
        typeof window === 'undefined' ||
        typeof window.matchMedia !== 'function'
    ) {
        return true;
    }
    return window.matchMedia(SM_BREAKPOINT_QUERY).matches;
}

/**
 * 縦に長い操作部を折り畳み可能にする共通パネル（N1 ダイヤグラム / N2 列車位置情報の
 * 操作部で共用）。
 *
 * - ヘッダー行（ラベル + 折り畳み時の現在設定の要約 + 開閉アイコン）を常時表示し、
 *   タップ / クリックで本文（ng-content）を開閉する
 * - 既定状態: デスクトップ（sm 以上）は展開、モバイル（sm 未満）は折り畳み
 * - 本文は CSS（tw-hidden）で隠すのみで DOM から破棄しない
 *   （mat-form-field 等の内部状態・購読を維持し、機能・表示項目は一切減らさない）
 * - sticky 配置や z-index は利用側の責務とする（このパネルは白背景 + 影の
 *   コンテナのみ提供する）
 */
@Component({
    selector: 'app-collapsible-panel',
    templateUrl: './collapsible-panel.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatIconModule],
    host: { class: 'tw-block' },
})
export class CollapsiblePanelComponent {
    /** ヘッダーに常時表示するパネル名（例: '表示設定'） */
    readonly label = input.required<string>();
    /** 折り畳み時にヘッダーへ表示する現在の設定の要約（例: 選択路線名・日付） */
    readonly summary = input<string>('');

    readonly expanded = signal<boolean>(isDesktopViewport());

    toggle(): void {
        this.expanded.update((expanded) => !expanded);
    }
}
