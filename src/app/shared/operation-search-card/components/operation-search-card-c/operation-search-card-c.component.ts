import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationSearchCardService } from '../../services/operation-search-card.service';
import {
    OperationSearchCardStateQuery,
    OperationSearchCardStateStore,
} from '../../states/operation-search-card.state';
import { OperationSearchCardPComponent } from '../operation-search-card-p/operation-search-card-p.component';

@Component({
    selector: 'app-operation-search-card-c',
    templateUrl: './operation-search-card-c.component.html',
    styleUrls: ['./operation-search-card-c.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [OperationSearchCardPComponent],
})
export class OperationSearchCardCComponent {
    readonly #operationSearchCardService = inject(OperationSearchCardService);
    readonly #operationSearchCardStateStore = inject(
        OperationSearchCardStateStore,
    );
    readonly #operationSearchCardStateQuery = inject(
        OperationSearchCardStateQuery,
    );

    readonly calendarId = toSignal(
        this.#operationSearchCardStateQuery.calendarId$,
    );
    readonly operationId = toSignal(
        this.#operationSearchCardStateQuery.operationId$,
    );
    readonly calendars = toSignal(
        this.#operationSearchCardStateQuery.calendars$,
    );
    readonly operations = toSignal(
        this.#operationSearchCardStateQuery.operations$,
    );

    readonly onSelectedCalendarId$ = new Subject<
        CalendarDetailsDto['calendarId']
    >();
    readonly onSelectedOperationId$ = new Subject<
        OperationDetailsDto['operationId']
    >();
    readonly onClickOperationTable$ = new Subject<
        CalendarDetailsDto['calendarId']
    >();
    readonly onClickRouteDiagram$ = new Subject<
        OperationDetailsDto['operationId']
    >();

    constructor() {
        this.#operationSearchCardStateQuery.calendarId$
            .pipe(
                switchMap(() =>
                    this.#operationSearchCardService.fetchOperations(),
                ),
                takeUntilDestroyed(),
            )
            .subscribe();

        this.onSelectedCalendarId$
            .asObservable()
            .pipe(takeUntilDestroyed())
            .subscribe((calendarId) => {
                this.#operationSearchCardStateStore.setCalendarId(calendarId);
                this.#operationSearchCardStateStore.setOperationId(null);
            });

        this.onSelectedOperationId$
            .asObservable()
            .pipe(takeUntilDestroyed())
            .subscribe((operationId) => {
                this.#operationSearchCardStateStore.setOperationId(operationId);
            });

        this.onClickOperationTable$
            .asObservable()
            .pipe(takeUntilDestroyed())
            .subscribe((calendarId) => {
                if (calendarId) {
                    this.#operationSearchCardService.emitSearchOperationTableEvent(
                        calendarId,
                    );
                }
            });

        this.onClickRouteDiagram$
            .asObservable()
            .pipe(takeUntilDestroyed())
            .subscribe((operationId) => {
                if (operationId) {
                    this.#operationSearchCardService.emitSearchOperationRouteDiagramEvent(
                        operationId,
                    );
                }
            });
    }
}
