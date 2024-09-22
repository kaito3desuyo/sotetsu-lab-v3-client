import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { mergeMap } from 'rxjs/operators';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { TimetableStationStateQuery } from '../../states/timetable-station.state';
import { TimetableStationTablePComponent } from '../timetable-station-table-p/timetable-station-table-p.component';

@Component({
    standalone: true,
    selector: 'app-timetable-station-table-c',
    templateUrl: './timetable-station-table-c.component.html',
    styleUrl: './timetable-station-table-c.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TimetableStationTablePComponent],
})
export class TimetableStationTableCComponent {
    readonly #calendarListStateQuery = inject(CalendarListStateQuery);
    readonly #timetableStationStateQuery = inject(TimetableStationStateQuery);

    readonly calendar = toSignal(
        this.#timetableStationStateQuery.calendarId$.pipe(
            mergeMap((id) =>
                this.#calendarListStateQuery.selectByCalendarId(id),
            ),
        ),
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
}
