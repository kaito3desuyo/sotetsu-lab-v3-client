import {
    ChangeDetectionStrategy,
    Component,
    input,
    signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * 縦に長い操作部を折り畳み可能にする共通パネル（N1 ダイヤグラム / N2 列車位置情報の
 * 操作部で共用）。
 *
 * - ヘッダー行（ラベル + 折り畳み時の現在設定の要約 + 開閉アイコン）を常時表示し、
 *   タップ / クリックで本文（ng-content）を開閉する
 * - 既定状態: ビューポート幅によらず**折り畳み**（docs/design.md「App 共通骨格」の②）。
 *   以前はデスクトップのみ展開していたが、ダイヤグラム / 列車位置情報では操作部が
 *   824px あり、1456x900 で本体（チャート・路線図）が完全にフォールド外へ
 *   押し出されていた（audit C1）。要約行に現在の設定を出すため情報は失われない
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

    readonly expanded = signal<boolean>(false);

    toggle(): void {
        this.expanded.update((expanded) => !expanded);
    }
}
