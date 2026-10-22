import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';
import { SegmentToggleOption } from '../segment-toggle/segment-toggle-option.type';
import { SegmentToggleComponent } from '../segment-toggle/segment-toggle.component';

/**
 * トップバーと操作帯の要約の行の直下に貼り付く上り／下りの切替（駅別時刻表）。全線時刻表でも使うが、ページがスクロールしないので sticky は効かないだけ（害は無い）。
 * 長い時刻表を読みながら切り替えられるようにする（ユーザー判断 2026-09-23・全線は 2026-10-22）。
 * 上下 8px の地は負マージンで打ち消し、main の gap を変えない。z は 1: ドロワーの遮光幕（z-10）より下。
 */
@Component({
    selector: 'app-sticky-direction-toggle',
    template: `
        <app-segment-toggle
            [options]="options"
            [value]="value()"
            (valueChange)="onChange($event)"
        ></app-segment-toggle>
    `,
    styleUrl: './sticky-direction-toggle.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [SegmentToggleComponent],
    host: {
        class: 'tw-block tw-sticky tw-top-[calc(48px_+_var(--control-band-offset,0px))] tw-z-[1] -tw-my-2 tw-bg-paper-2 tw-py-2 md:tw-top-[calc(64px_+_var(--control-band-offset,0px))]',
    },
})
export class StickyDirectionToggleComponent {
    readonly value = input<ETripDirection | null | undefined>();
    readonly valueChange = output<ETripDirection>();

    readonly options: readonly [SegmentToggleOption, SegmentToggleOption] = [
        { value: ETripDirection.INBOUND, label: '上り' },
        { value: ETripDirection.OUTBOUND, label: '下り' },
    ];

    onChange(value: number | string): void {
        const direction = Number(value) as ETripDirection;
        if (direction === this.value()) return;
        this.valueChange.emit(direction);
    }
}
