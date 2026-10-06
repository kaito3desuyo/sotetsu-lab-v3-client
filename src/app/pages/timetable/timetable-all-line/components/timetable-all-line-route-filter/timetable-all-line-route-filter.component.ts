import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FilterChipValue } from 'src/app/shared/filter-chips/filter-chip-option.type';
import { ControlBandComponent } from 'src/app/shared/control-band/control-band.component';
import {
    formatRouteFilterSummary,
    isRouteFilterActive,
} from 'src/app/shared/control-band/control-band-summary.util';
import { FilterChipsComponent } from 'src/app/shared/filter-chips/filter-chips.component';
import { TimetableAllLineStore } from '../../stores/timetable-all-line.store';

/**
 * B6: 全線時刻表の路線絞り込みチップ（複数選択）。会社ごとにまとめて出す。
 *
 * 既定は自社（相鉄）の路線だけ ON（駅データ取得後に initializeSelectedRouteIds で設定される）。
 * 選択路線を絞ると表示駅の行が追従し、表示駅に停まらない列車は列から外れる。
 */
@Component({
    selector: 'app-timetable-all-line-route-filter',
    templateUrl: './timetable-all-line-route-filter.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ControlBandComponent, FilterChipsComponent],
    host: { class: 'tw-contents' },
})
export class TimetableAllLineRouteFilterComponent {
    readonly routeOptions = toSignal(TimetableAllLineStore.routeOptions$, {
        initialValue: [],
    });
    readonly selectedRouteIds = toSignal(
        TimetableAllLineStore.selectedRouteIds$,
        { initialValue: [] },
    );

    readonly filterActive = computed(() =>
        isRouteFilterActive(this.routeOptions(), this.selectedRouteIds()),
    );
    readonly bandSummary = computed(() => {
        const routes = formatRouteFilterSummary(
            this.routeOptions(),
            this.selectedRouteIds(),
        );
        return routes === '全路線' ? routes : `路線：${routes}`;
    });

    onChange(values: FilterChipValue[]): void {
        TimetableAllLineStore.setSelectedRouteIds(values);
    }
}
