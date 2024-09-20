import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RxState } from '@rx-angular/state';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { TodaysOperationListStateQuery } from 'src/app/global-states/todays-operation-list.state';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { OperationRealTimeTableColumn } from '../../enums/operation-real-time.enum';
import { IOperationRealTimeTableData } from '../../interfaces/operation-real-time-table-data.interface';
import { OperationRealTimeStateQuery } from '../../states/operation-real-time.state';
import { OperationRealTimeUtil } from '../../utils/operation-real-time.util';
import { OperationRealTimeNewTablePComponent } from '../operation-real-time-new-table-p/operation-real-time-new-table-p.component';

type State = {
    displayedColumns: OperationRealTimeTableColumn[];
    data: IOperationRealTimeTableData[];
    todaysCalendarId: CalendarDetailsDto['calendarId'];
    stations: StationDetailsDto[];
    tripClasses: TripClassDetailsDto[];
};

@Component({
    standalone: true,
    selector: 'app-operation-real-time-new-table-by-operation-c',
    templateUrl:
        './operation-real-time-new-table-by-operation-c.component.html',
    styleUrls: [
        './operation-real-time-new-table-by-operation-c.component.scss',
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, OperationRealTimeNewTablePComponent],
    providers: [RxState],
})
export class OperationRealTimeNewTableByOperationCComponent {
    readonly #state = inject<RxState<State>>(RxState);
    readonly #todaysCalendarListStateQuery = inject(
        TodaysCalendarListStateQuery,
    );
    readonly #todaysOperationListStateQuery = inject(
        TodaysOperationListStateQuery,
    );
    readonly #routeStationListStateQuery = inject(RouteStationListStateQuery);
    readonly #operationRealTimeStateQuery = inject(OperationRealTimeStateQuery);

    readonly operationRealTimeTableColumn = OperationRealTimeTableColumn;

    readonly displayedColumns = toSignal(
        this.#state.select('displayedColumns'),
    );
    readonly data = toSignal(this.#state.select('data'));
    readonly todaysCalendarId = toSignal(
        this.#state.select('todaysCalendarId'),
    );
    readonly stations = toSignal(this.#state.select('stations'));
    readonly tripClasses = toSignal(this.#state.select('tripClasses'));

    constructor() {
        this.#state.connect(
            'displayedColumns',
            combineLatest([
                this.#operationRealTimeStateQuery.isVisibleSightingHistories$,
                this.#operationRealTimeStateQuery.isVisibleCurrentPosition$,
            ]).pipe(
                map(
                    ([
                        isVisibleSightingHistories,
                        isVisibleCurrentPosition,
                    ]) => {
                        let columns: OperationRealTimeTableColumn[] = [
                            'operationNumber',
                            'formationNumber',
                            'sightingHistories',
                            'currentPosition',
                            'sightingTime',
                            'updatedAt',
                        ];

                        if (!isVisibleSightingHistories) {
                            columns = columns.filter(
                                (c) => c !== 'sightingHistories',
                            );
                        }

                        if (!isVisibleCurrentPosition) {
                            columns = columns.filter(
                                (c) => c !== 'currentPosition',
                            );
                        }

                        return columns;
                    },
                ),
            ),
        );

        this.#state.connect(
            'data',
            combineLatest([
                this.#todaysOperationListStateQuery.todaysOperationsSorted$,
                this.#operationRealTimeStateQuery
                    .operationSightingTimeCrossSections$,
                this.#operationRealTimeStateQuery.operationSightingHistories$,
                this.#operationRealTimeStateQuery.currentPositions$,
            ]).pipe(
                map(
                    ([
                        operations,
                        timeCrossSections,
                        histories,
                        currentPositions,
                    ]) =>
                        OperationRealTimeUtil.generateOperationTableData(
                            operations,
                            timeCrossSections,
                            histories,
                            currentPositions,
                        ),
                ),
            ),
        );

        this.#state.connect(
            'todaysCalendarId',
            this.#todaysCalendarListStateQuery.todaysCalendarId$,
        );

        this.#state.connect(
            'stations',
            this.#routeStationListStateQuery.stations$,
        );

        this.#state.connect(
            'tripClasses',
            this.#operationRealTimeStateQuery.tripClasses$,
        );
    }
}
