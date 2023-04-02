import { Component } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { switchMap } from 'rxjs/operators';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationSearchCardService } from '../../services/operation-search-card.service';
import {
    OperationSearchCardStateQuery,
    OperationSearchCardStateStore,
} from '../../states/operation-search-card.state';

@Component({
    selector: 'app-operation-search-card-c',
    templateUrl: './operation-search-card-c.component.html',
    styleUrls: ['./operation-search-card-c.component.scss'],
    providers: [RxState],
})
export class OperationSearchCardCComponent {
    readonly calendarId$ = this.operationSearchCardStateQuery.calendarId$;
    readonly operationId$ = this.operationSearchCardStateQuery.operationId$;
    readonly calendars$ = this.operationSearchCardStateQuery.calendars$;
    readonly operations$ = this.operationSearchCardStateQuery.operations$;

    constructor(
        private readonly state: RxState<{}>,
        private readonly operationSearchCardService: OperationSearchCardService,
        private readonly operationSearchCardStateStore: OperationSearchCardStateStore,
        private readonly operationSearchCardStateQuery: OperationSearchCardStateQuery
    ) {
        this.state.hold(
            this.calendarId$.pipe(
                switchMap(() =>
                    this.operationSearchCardService.fetchOperations()
                )
            )
        );
    }

    onReceiveSelectCalendarId(
        calendarId: CalendarDetailsDto['calendarId']
    ): void {
        this.operationSearchCardStateStore.setCalendarId(calendarId);
        this.operationSearchCardStateStore.setOperationId(null);
    }

    onReceiveSelectOperationId(
        operationId: OperationDetailsDto['operationId']
    ): void {
        this.operationSearchCardStateStore.setOperationId(operationId);
    }

    onReceiveClickSearch(): void {
        const calendarId = this.operationSearchCardStateQuery.calendarId;
        const operationId = this.operationSearchCardStateQuery.operationId;

        if (operationId) {
            this.operationSearchCardService.emitSearchOperationRouteDiagramEvent(
                operationId
            );
            return;
        }

        if (calendarId) {
            this.operationSearchCardService.emitSearchOperationTableEvent(
                calendarId
            );
            return;
        }
    }
}
