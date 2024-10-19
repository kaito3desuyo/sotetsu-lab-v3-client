import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs/operators';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { OperationTableStateQuery } from '../../states/operation-table.state';
import { OperationTableTablePresentationalComponent } from '../operation-table-table-presentational/operation-table-table-presentational.component';

@Component({
    standalone: true,
    selector: 'app-operation-table-table-container',
    templateUrl: './operation-table-table-container.component.html',
    styleUrls: ['./operation-table-table-container.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [OperationTableTablePresentationalComponent],
})
export class OperationTableTableContainerComponent {
    readonly #calendarListStateQuery = inject(CalendarListStateQuery);
    readonly #operationTableStateQuery = inject(OperationTableStateQuery);

    readonly calendar = toSignal(
        this.#operationTableStateQuery.calendarId$.pipe(
            switchMap((calendarId) =>
                this.#calendarListStateQuery.selectByCalendarId(calendarId),
            ),
        ),
    );
    readonly operationTrips = toSignal(
        this.#operationTableStateQuery.operationTrips$,
    );
    readonly stations = toSignal(this.#operationTableStateQuery.stations$);
    readonly tripClasses = toSignal(
        this.#operationTableStateQuery.tripClasses$,
    );
}
