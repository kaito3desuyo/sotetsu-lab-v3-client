import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
} from '@angular/core';
import { FilterChipValue } from 'src/app/shared/filter-chips/filter-chip-option.type';
import { ControlBandComponent } from 'src/app/shared/control-band/control-band.component';
import {
    formatRouteFilterSummary,
    isRouteFilterActive,
    joinSummaryParts,
} from 'src/app/shared/control-band/control-band-summary.util';
import { FilterChipsComponent } from 'src/app/shared/filter-chips/filter-chips.component';
import { SkeletonChipsComponent } from 'src/app/shared/skeleton/skeleton-chips.component';
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
    imports: [
        ControlBandComponent,
        FilterChipsComponent,
        SkeletonChipsComponent,
    ],
    host: { class: 'tw-contents' },
})
export class TimetableAllLineRouteFilterComponent {
    /** ページが帯に選択欄を差し込むときは、取る前やチップが無いときも帯を出す（2026-10-22） */
    readonly alwaysVisible = input(false);
    /** 要約の頭（ダイヤと方向）。路線の要約の前に付ける */
    readonly summaryLead = input('');

    readonly #store = inject(TimetableAllLineStore);

    readonly routeOptions = this.#store.routeOptions;
    readonly selectedRouteIds = this.#store.selectedRouteIds;

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
    readonly isAwaitingTripBlocks = this.#store.isAwaitingTripBlocks;
    /** 取る前は要約を出さない（「全路線」と出してから「路線：…」に変わらないように） */
    readonly bandSummaryOrEmpty = computed(() =>
        joinSummaryParts([
            this.summaryLead(),
            this.isAwaitingTripBlocks() ? null : this.bandSummary(),
        ]),
    );
    /** 路線のチップの骨組みの幅（本番で測った本線・いずみ野線・厚木線・新横浜線・相鉄・JR直通線…の幅） */
    readonly routeSkeletonWidths = [
        'tw-w-[83px]',
        'tw-w-[125px]',
        'tw-w-[97px]',
        'tw-w-[111px]',
        'tw-w-[129px]',
        'tw-w-[69px]',
        'tw-w-[69px]',
        'tw-w-[97px]',
    ];

    onChange(values: FilterChipValue[]): void {
        this.#store.setSelectedRouteIds(values);
    }
}
