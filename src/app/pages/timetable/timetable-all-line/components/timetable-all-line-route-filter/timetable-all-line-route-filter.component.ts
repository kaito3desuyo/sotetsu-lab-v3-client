import { ChangeDetectionStrategy, Component } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FilterChipValue } from 'src/app/shared/filter-chips/filter-chip-option.type';
import { FilterChipsComponent } from 'src/app/shared/filter-chips/filter-chips.component';
import { TimetableAllLineStore } from '../../stores/timetable-all-line.store';

/**
 * B6: 全線時刻表の路線絞り込みチップ（複数選択）。
 *
 * 既定は全路線 ON（駅データ取得後に initializeSelectedRouteIds で設定される）。
 * 選択路線を絞ると表示駅行と罫線がデータ駆動で追従する（列＝列車は影響を受けない）。
 */
@Component({
    selector: 'app-timetable-all-line-route-filter',
    templateUrl: './timetable-all-line-route-filter.component.html',
    styleUrl: './timetable-all-line-route-filter.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FilterChipsComponent],
})
export class TimetableAllLineRouteFilterComponent {
    readonly routeOptions = toSignal(TimetableAllLineStore.routeOptions$, {
        initialValue: [],
    });
    readonly selectedRouteIds = toSignal(
        TimetableAllLineStore.selectedRouteIds$,
        { initialValue: [] },
    );

    onChange(values: FilterChipValue[]): void {
        TimetableAllLineStore.setSelectedRouteIds(values);
    }
}
