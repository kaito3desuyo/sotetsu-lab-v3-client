import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * 空状態ブロック共通部品（20-design-ui.md §4 / 25-design-review.md R-7）。
 *
 * アイコン + 説明 + 次アクションボタンの縦積みレイアウトで空状態を表現する
 * （モック 07 準拠）。R-7「空状態は必ず次のアクションを示す」に従い、
 * `actionLabel` 指定時のみボタンを描画する（未指定時は説明文のみ）。
 */
@Component({
    selector: 'app-empty-state',
    templateUrl: './empty-state.component.html',
    styleUrl: './empty-state.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatIconModule, MatButtonModule],
    host: { class: 'tw-block' },
})
export class EmptyStateComponent {
    readonly icon = input<string>(undefined);
    readonly message = input.required<string>();
    /** 説明2行目（補足文）。mockup-07 の「ダイヤまたは方向を変えて…」に対応。省略時は非表示。 */
    readonly subtitle = input<string>(undefined);
    readonly actionLabel = input<string>(undefined);

    readonly actionClick = output<void>();
}
