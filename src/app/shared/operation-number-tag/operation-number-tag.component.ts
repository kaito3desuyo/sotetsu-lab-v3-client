import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PipesModule } from 'src/app/core/pipes/pipes.module';

/**
 * 運用番号タグ共通部品。
 *
 * 群色（`operation-number-color.pipe` 規則: 先頭 1=赤 / 2=黄 / 4=黄緑 / 5=青 /
 * 6=藍 / 7-9=緑青 / G 含む=紺 / K 含む=赤茶 / 100（休車）=灰、12% 透過背景）を
 * 適用したタグとして運用番号を描画する。色は UI 側でハードコードせず既存 pipe に委譲する。
 *
 * 行路図等へのリンクは任意（`link` 未指定時はタグのみ表示）。
 * 形状は角型固定（丸型に固定しない方針 = 20-design-ui.md §1）。
 */
@Component({
    selector: 'app-operation-number-tag',
    templateUrl: './operation-number-tag.component.html',
    styleUrl: './operation-number-tag.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, PipesModule],
    host: { class: 'tw-inline-block' },
})
export class OperationNumberTagComponent {
    readonly operationNumber = input.required<string>();
    readonly link = input<string[]>(undefined);
}
