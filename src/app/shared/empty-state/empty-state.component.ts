import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AppButtonComponent } from '../app-button/app-button.component';

/**
 * 空状態ブロック共通部品（20-design-ui.md §4 / 25-design-review.md R-7）。
 *
 * アイコン + 説明 + 次アクションで空状態を表現する。R-7「空状態は必ず次のアクションを
 * 示す」に従い、`actionLabel` 指定時のみボタンを描画する（未指定時は説明文のみ）。
 *
 * レイアウトは中央寄せの縦積みをやめ**左揃え**にした。直前のフォームや一覧の続きとして
 * 読ませるためで、中央寄せ大アイコンの定型は使わない（docs/design.md / audit M8）。
 * ボタンは app-button の副アクションに統一する（audit M6）。
 */
@Component({
    selector: 'app-empty-state',
    templateUrl: './empty-state.component.html',
    styleUrl: './empty-state.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatIconModule, AppButtonComponent],
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
