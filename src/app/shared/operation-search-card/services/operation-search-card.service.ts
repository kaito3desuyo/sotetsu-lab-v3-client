import { inject, Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import {
    OperationSearchCardStateQuery,
    OperationSearchCardStateStore,
} from '../states/operation-search-card.state';

@Injectable()
export class OperationSearchCardService {
    readonly #operationService = inject(OperationService);
    readonly #operationSearchCardStateStore = inject(
        OperationSearchCardStateStore,
    );
    readonly #operationSearchCardStateQuery = inject(
        OperationSearchCardStateQuery,
    );

    readonly #searchOpeartionTableEvent$ = new Subject<
        CalendarDetailsDto['calendarId']
    >();
    readonly #searchOpeartionRouteDiagramEvent$ = new Subject<
        OperationDetailsDto['operationId']
    >();

    emitSearchOperationTableEvent(
        calendarId: CalendarDetailsDto['calendarId'],
    ): void {
        this.#searchOpeartionTableEvent$.next(calendarId);
    }

    receiveSearchOperationTableEvent(): Observable<
        CalendarDetailsDto['calendarId']
    > {
        return this.#searchOpeartionTableEvent$.asObservable();
    }

    emitSearchOperationRouteDiagramEvent(
        operationId: OperationDetailsDto['operationId'],
    ): void {
        this.#searchOpeartionRouteDiagramEvent$.next(operationId);
    }

    receiveSearchOperationRouteDiagramEvent(): Observable<
        OperationDetailsDto['operationId']
    > {
        return this.#searchOpeartionRouteDiagramEvent$.asObservable();
    }

    fetchOperations(): Observable<void> {
        const calendarId = this.#operationSearchCardStateQuery.calendarId;

        return this.#operationService.findManyByCalendarId({ calendarId }).pipe(
            map((operations) =>
                operations.filter((o) => o.operationNumber !== '100'),
            ),
            tap((operations: OperationDetailsDto[]) => {
                this.#operationSearchCardStateStore.setOperations(operations);
            }),
            map(() => undefined),
        );
    }
}
