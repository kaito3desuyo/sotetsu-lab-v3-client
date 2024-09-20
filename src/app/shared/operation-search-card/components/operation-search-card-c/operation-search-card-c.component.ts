import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RxState } from '@rx-angular/state';
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
    standalone: true,
    selector: 'app-operation-search-card-c',
    templateUrl: './operation-search-card-c.component.html',
    styleUrls: ['./operation-search-card-c.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [RxState],
    imports: [CommonModule, OperationSearchCardPComponent],
})
export class OperationSearchCardCComponent {
    readonly #state = inject(RxState);
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
    readonly onClickedSearch$ = new Subject<void>();

    constructor() {
        this.#state.hold(
            this.#operationSearchCardStateQuery.calendarId$.pipe(
                switchMap(() =>
                    this.#operationSearchCardService.fetchOperations(),
                ),
            ),
        );

        this.#state.hold(
            this.onSelectedCalendarId$.asObservable(),
            (calendarId) => {
                this.#operationSearchCardStateStore.setCalendarId(calendarId);
                this.#operationSearchCardStateStore.setOperationId(null);
            },
        );

        this.#state.hold(
            this.onSelectedOperationId$.asObservable(),
            (operationId) => {
                this.#operationSearchCardStateStore.setOperationId(operationId);
            },
        );

        this.#state.hold(this.onClickedSearch$.asObservable(), () => {
            const calendarId = this.#operationSearchCardStateQuery.calendarId;
            const operationId = this.#operationSearchCardStateQuery.operationId;

            if (operationId) {
                this.#operationSearchCardService.emitSearchOperationRouteDiagramEvent(
                    operationId,
                );
                return;
            }

            if (calendarId) {
                this.#operationSearchCardService.emitSearchOperationTableEvent(
                    calendarId,
                );
                return;
            }
        });
    }
}
