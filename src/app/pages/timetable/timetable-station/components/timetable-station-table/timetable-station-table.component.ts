import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { TimetableStationTripCellComponent } from '../timetable-station-trip-cell/timetable-station-trip-cell.component';
import { TimetableStationStore } from '../../stores/timetable-station.store';

@Component({
    selector: 'app-timetable-station-table',
    templateUrl: './timetable-station-table.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, TimetableStationTripCellComponent],
})
export class TimetableStationTableComponent {
    readonly tripDirectionEnum = ETripDirection;

    /**
     * B7: 過去ダイヤ表示時は false になり、充当編成列（⑥）自体を描画しない。
     * 判定はルートコンポーネントの派生値（isTodaysCalendar）をそのまま受け取る。
     */
    readonly showCurrentFormation = input.required<boolean>();

    readonly calendar = toSignal(TimetableStationStore.calendar$);
    readonly tripClasses = toSignal(TimetableStationStore.tripClasses$, {
        initialValue: [],
    });
    readonly stations = toSignal(TimetableStationStore.stations$, {
        initialValue: [],
    });
    readonly timetableData = toSignal(TimetableStationStore.timetableData$, {
        initialValue: [],
    });
    readonly operations = toSignal(TimetableStationStore.operations$, {
        initialValue: [],
    });
    readonly operationSightingTimeCrossSections = toSignal(
        TimetableStationStore.operationSightingTimeCrossSections$,
        { initialValue: {} },
    );
    readonly stationId = toSignal(TimetableStationStore.stationId$);
}
