import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
} from '@angular/core';
import { baseTripClassName } from '../trip-class-base-name.util';

const BASE_CLASS =
    'trip-class-chip-label tw-inline-block tw-shrink-0 tw-rounded tw-font-bold tw-leading-tight tw-text-white';

/**
 * 種別の共通表現（ユーザー指示 2026-08-22）。
 *
 * 種別は**全ページで塗りチップ**に統一する。塗り色は tripClassColor（ドメインデータ）を
 * そのまま使い、文字は白 + 縁取り（`.trip-class-chip-label` / styles.scss）で読ませる。
 * 縁取りの経緯は docs/design.md「色の掟 4 の例外: 種別色チップ」。
 *
 * **列車番号はチップに含めない。** チップは種別だけを表し、列車番号は隣に別要素として
 * 置く（ユーザー指示 2026-08-22）。以前は運用表・ダイヤグラム情報パネルで
 * 「快速 2002」のように 1 つのチップへ同居していた。
 *
 * **セレクトボックスの選択肢はチップにしない**（ユーザー指示 2026-08-22）。
 * 選択肢は系統付きの正式名（例: 特急（SO→TY））が必要で、チップ化すると窮屈になる。
 * 該当箇所は timetable-edit-form-trips の mat-option / mat-select-trigger。
 */
@Component({
    selector: 'app-trip-class-chip',
    template: `
        <span [class]="chipClass()" [style.background-color]="color() || null">
            {{ displayLabel() }}
        </span>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [],
    host: { class: 'tw-inline-flex' },
})
export class TripClassChipComponent {
    /** 種別名。系統サフィックス「（…）」は除去して表示する。 */
    readonly label = input.required<string | null | undefined>();
    /** tripClassColor。未指定（回送等で色が無い場合）はグレーで塗る。 */
    readonly color = input<string | null | undefined>(undefined);
    /** 密度の高い面（列車位置情報カード等）では sm。 */
    readonly size = input<'sm' | 'md'>('md');

    readonly displayLabel = computed(() => baseTripClassName(this.label()));

    readonly chipClass = computed(() => {
        const size =
            this.size() === 'sm'
                ? 'tw-px-1 tw-py-px tw-text-[10px]'
                : 'tw-px-1.5 tw-py-0.5 tw-text-xs';
        const fallback = this.color() ? '' : ' tw-bg-grey-500';
        return `${BASE_CLASS} ${size}${fallback}`;
    });
}
