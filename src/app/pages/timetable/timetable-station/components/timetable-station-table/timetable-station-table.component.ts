import {
    ChangeDetectionStrategy,
    Component,
    inject,
    input,
} from '@angular/core';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';
import { TimetableStationTripCellComponent } from '../timetable-station-trip-cell/timetable-station-trip-cell.component';
import { TimetableStationStore } from '../../stores/timetable-station.store';

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
}
