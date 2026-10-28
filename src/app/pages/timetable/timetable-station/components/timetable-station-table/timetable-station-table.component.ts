import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
} from '@angular/core';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';
import { TimetableStationTripCellComponent } from '../timetable-station-trip-cell/timetable-station-trip-cell.component';
import { TimetableStationStore } from '../../stores/timetable-station.store';
import { estimateStationRowHeight } from '../../utils/station-row-height.util';

@Component({
    selector: 'app-timetable-station-table',
    templateUrl: './timetable-station-table.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TimetableStationTripCellComponent],
})
export class TimetableStationTableComponent {
    readonly tripDirectionEnum = ETripDirection;

    /**
     * B7: 過去ダイヤ表示時は false になり、充当編成列（⑥）自体を描画しない。
     * 判定はルートコンポーネントの派生値（isTodaysCalendar）をそのまま受け取る。
     */
    readonly showCurrentFormation = input.required<boolean>();

    readonly #store = inject(TimetableStationStore);

    readonly calendar = this.#store.calendar;
    readonly tripClasses = this.#store.tripClasses;
    readonly stations = this.#store.stations;
    readonly timetableData = this.#store.timetableData;
    readonly operations = this.#store.operations;
    readonly operationSightingTimeCrossSections =
        this.#store.operationSightingTimeCrossSections;
    readonly stationId = this.#store.stationId;

    /**
     * 時の行ごとの高さの見積もり（キーは行の `day:hour`）。画面外の行の場所取り
     * （content-visibility と @defer の placeholder）に使う。行ごとに変更検知のたびに
     * 計算し直さないよう、データと編成の表示が変わったときだけここでまとめて出す
     */
    readonly rowHeights = computed(
        () =>
            new Map(
                this.timetableData().map((item) => [
                    `${item.day}:${item.hour}`,
                    estimateStationRowHeight(
                        item.trips,
                        this.showCurrentFormation(),
                    ),
                ]),
            ),
    );
}
