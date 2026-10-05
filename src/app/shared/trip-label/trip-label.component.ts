import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TripClassChipComponent } from '../trip-class-chip/trip-class-chip.component';

/**
 * 「種別 列車番号」の共通部品（ユーザー指示 2026-10-05）。
 *
 * 種別は塗りチップ、列車番号はチップの外（2026-08-22 の決まり）。
 * **列車番号だけが全線時刻表（その列車の運行を選んだ状態）へのリンク**で、下線を引いて
 * リンクだと分かるようにする。種別チップはリンクにしない。link が無いときは下線の無い文字。
 * 列車番号の字の大きさ・太さ・色は置き場所に合わせるので、ホストに付けたクラスを引き継ぐ。
 */
@Component({
    selector: 'app-trip-label',
    template: `
        <app-trip-class-chip
            [size]="chipSize()"
            [label]="tripClassName()"
            [color]="tripClassColor()"
        ></app-trip-class-chip>
        @if (link(); as link) {
            <a
                data-trip-number
                class="tw-tabular-nums tw-underline tw-underline-offset-2 [color:inherit]"
                [routerLink]="link"
                (click)="linkClicked.emit()"
                >{{ tripNumber() }}</a
            >
        } @else {
            <span data-trip-number class="tw-tabular-nums">{{
                tripNumber()
            }}</span>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, TripClassChipComponent],
    host: {
        class: 'tw-inline-flex tw-items-center tw-gap-1 tw-whitespace-nowrap',
    },
})
export class TripLabelComponent {
    readonly tripClassName = input<string | null | undefined>();
    readonly tripClassColor = input<string | null | undefined>();
    readonly tripNumber = input<string | null | undefined>();
    /** 全線時刻表への routerLink（例 ['/timetable/all-line', { calendar_id, trip_direction, trip_block_id }]） */
    readonly link = input<readonly unknown[] | null | undefined>();
    readonly chipSize = input<'sm' | 'md'>('md');

    /** 列車番号のリンクを押したとき（情報パネルを閉じる等、親で処理を挟む用） */
    readonly linkClicked = output<void>();
}
