import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { selectSlice } from '@rx-angular/state/selections';
import { RxPush } from '@rx-angular/template/push';
import { map } from 'rxjs/operators';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { TodaysOperationListStateQuery } from 'src/app/global-states/todays-operation-list.state';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { OperationCurrentPositionDto } from 'src/app/libs/operation/usecase/dtos/operation-current-position.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
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
    operations: OperationDetailsDto[];
    timeCrossSections: OperationSightingTimeCrossSectionDto[];
    histories: OperationSightingDetailsDto[];
    currentPositions: OperationCurrentPositionDto[];
    isVisibleSightingHistories: boolean;
    isVisibleCurrentPosition: boolean;
};

@Component({
    standalone: true,
    selector: 'app-operation-real-time-new-table-by-operation-c',
    templateUrl:
        './operation-real-time-new-table-by-operation-c.component.html',
    styleUrls: [
        './operation-real-time-new-table-by-operation-c.component.scss',
    ],
    imports: [CommonModule, RxPush, OperationRealTimeNewTablePComponent],
    providers: [RxState],
})
export class OperationRealTimeNewTableByOperationCComponent {
    private readonly state = inject<RxState<State>>(RxState);
    private readonly todaysCalendarListStateQuery = inject(
        TodaysCalendarListStateQuery,
    );
    readonly #todaysOperationListStateQuery = inject(
        TodaysOperationListStateQuery,
    );
    private readonly routeStationListStateQuery = inject(
        RouteStationListStateQuery,
    );
    private readonly operationRealTimeStateQuery = inject(
        OperationRealTimeStateQuery,
    );

    readonly operationRealTimeTableColumn = OperationRealTimeTableColumn;

    readonly displayedColumns$ = this.state.select('displayedColumns');
    readonly data$ = this.state.select('data');
    readonly todaysCalendarId$ = this.state.select('todaysCalendarId');
    readonly stations$ = this.state.select('stations');
    readonly tripClasses$ = this.state.select('tripClasses');

    constructor() {
        this.state.connect(
            'displayedColumns',
            this.state
                .select(
                    selectSlice([
                        'isVisibleSightingHistories',
                        'isVisibleCurrentPosition',
                    ]),
                )
                .pipe(
                    map(
                        ({
                            isVisibleSightingHistories,
                            isVisibleCurrentPosition,
                        }) => {
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

        this.state.connect(
            'data',
            this.state
                .select(
                    selectSlice([
                        'operations',
                        'timeCrossSections',
                        'histories',
                        'currentPositions',
                    ]),
                )
                .pipe(
                    map(
                        ({
                            operations,
                            timeCrossSections,
                            histories,
                            currentPositions,
                        }) =>
                            OperationRealTimeUtil.generateOperationTableData(
                                operations,
                                timeCrossSections,
                                histories,
                                currentPositions,
                            ),
                    ),
                ),
        );

        this.state.connect(
            'todaysCalendarId',
            this.todaysCalendarListStateQuery.todaysCalendarId$,
        );

        this.state.connect(
            'stations',
            this.routeStationListStateQuery.stations$,
        );

        this.state.connect(
            'tripClasses',
            this.operationRealTimeStateQuery.tripClasses$,
        );

        this.state.connect(
            'operations',
            this.#todaysOperationListStateQuery.todaysOperationsSorted$,
        );

        this.state.connect(
            'timeCrossSections',
            this.operationRealTimeStateQuery
                .operationSightingTimeCrossSections$,
        );

        this.state.connect(
            'histories',
            this.operationRealTimeStateQuery.operationSightingHistories$,
        );

        this.state.connect(
            'currentPositions',
            this.operationRealTimeStateQuery.currentPositions$,
        );

        this.state.connect(
            'isVisibleSightingHistories',
            this.operationRealTimeStateQuery.isVisibleSightingHistories$,
        );

        this.state.connect(
            'isVisibleCurrentPosition',
            this.operationRealTimeStateQuery.isVisibleCurrentPosition$,
        );
    }
}
