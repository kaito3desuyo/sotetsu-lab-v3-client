import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TimetableStationStateQuery } from '../../states/timetable-station.state';
import { TimetableStationTablePComponent } from '../timetable-station-table-p/timetable-station-table-p.component';

@Component({
    selector: 'app-timetable-station-table-c',
    templateUrl: './timetable-station-table-c.component.html',
    styleUrl: './timetable-station-table-c.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TimetableStationTablePComponent]
})
export class TimetableStationTableCComponent {
    readonly #timetableStationStateQuery = inject(TimetableStationStateQuery);

    readonly calendar = toSignal(
        this.#timetableStationStateQuery.calendar$,
    );
    readonly stationName = toSignal(
        this.#timetableStationStateQuery.stationName$,
    );
    readonly tripDirection = toSignal(
        this.#timetableStationStateQuery.tripDirection$,
    );
    readonly tripClasses = toSignal(
        this.#timetableStationStateQuery.tripClasses$,
    );
    readonly stations = toSignal(this.#timetableStationStateQuery.stations$);
    readonly timetableData = toSignal(
        this.#timetableStationStateQuery.timetableData$,
    );
    readonly operations = toSignal(
        this.#timetableStationStateQuery.operations$,
    );
    readonly operationSightingTimeCrossSections = toSignal(
        this.#timetableStationStateQuery.operationSightingTimeCrossSections$,
    );
    readonly stationId = toSignal(
        this.#timetableStationStateQuery.stationId$,
    );
}
