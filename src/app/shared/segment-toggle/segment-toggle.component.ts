import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import {
    MatButtonToggleChange,
    MatButtonToggleModule,
} from '@angular/material/button-toggle';
import { FilterChipValue } from '../filter-chips/filter-chip-option.type';
import { SegmentToggleOption } from './segment-toggle-option.type';

/**
 * セグメントトグル共通部品（98 G0-3）。
 *
 * mat-button-toggle-group/mat-button-toggle（単一選択モード）で
 * 上り/下り・現在時刻/時刻指定・編成番号/車両番号 等の2値トグルを
 * モック準拠の全幅の等分ボタンで表現する（controlled component。
 * 永続化は利用側の責務）。
 *
 * 単一選択グループは同一値を再選択してもクリックイベントが
 * 発火しない（Material の仕様）ため、既に選択済みのセグメントを
 * クリックしても valueChange は発火しない従来動作をそのまま維持する。
 */
@Component({
    selector: 'app-segment-toggle',
    templateUrl: './segment-toggle.component.html',
    styleUrl: './segment-toggle.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonToggleModule],
    host: { class: 'tw-block tw-w-full' },
})
export class SegmentToggleComponent {
    /** 2要素が基本。3要素（両方/上り/下り）も等分で並べる */
    readonly options = input.required<readonly SegmentToggleOption[]>();
    readonly value = input<FilterChipValue | undefined>(undefined);
    readonly disabled = input<boolean>(false);

    readonly valueChange = output<FilterChipValue>();

    protected onChange(event: MatButtonToggleChange): void {
        this.valueChange.emit(event.value as FilterChipValue);
    }
}
