import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RxState, selectSlice } from '@rx-angular/state';
import { PushModule } from '@rx-angular/template/push';
import { map, pluck } from 'rxjs/operators';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationSightingWithCirculatedDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-with-circulated.dto';
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
    latestOperationSightings: OperationSightingWithCirculatedDto[];
    currentPositions: OperationCurrentPositionDto[];
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
    imports: [CommonModule, PushModule, OperationRealTimeNewTablePComponent],
    providers: [RxState],
})
export class OperationRealTimeNewTableByOperationCComponent {
    private readonly state = inject<RxState<State>>(RxState);
    private readonly todaysCalendarListStateQuery = inject(
        TodaysCalendarListStateQuery
    );
    private readonly routeStationListStateQuery = inject(
        RouteStationListStateQuery
    );
    private readonly operationRealTimeStateQuery = inject(
        OperationRealTimeStateQuery
    );

    readonly operationRealTimeTableColumn = OperationRealTimeTableColumn;

    readonly displayedColumns$ = this.state.select('displayedColumns');
    readonly data$ = this.state.select('data');
    readonly todaysCalendarId$ = this.state.select('todaysCalendarId');
    readonly stations$ = this.state.select('stations');
    readonly tripClasses$ = this.state.select('tripClasses');

    constructor() {
        this.state.set({
            displayedColumns: [
                'operationNumber',
                'formationNumber',
                'currentPosition',
                'sightingTime',
                'updatedAt',
            ],
        });

        this.state.connect(
            'displayedColumns',
            this.state.select('isVisibleCurrentPosition').pipe(
                map((bool) => {
                    if (bool) {
                        return [
                            'operationNumber',
                            'formationNumber',
                            'currentPosition',
                            'sightingTime',
                            'updatedAt',
                        ] as OperationRealTimeTableColumn[];
                    } else {
                        return [
                            'operationNumber',
                            'formationNumber',
                            'sightingTime',
                            'updatedAt',
                        ] as OperationRealTimeTableColumn[];
                    }
                })
            )
        );

        this.state.connect(
            'data',
            this.state
                .select(
                    selectSlice([
                        'operations',
                        'latestOperationSightings',
                        'currentPositions',
                    ])
                )
                .pipe(
                    map(
                        ({
                            operations: operations,
                            latestOperationSightings: sightings,
                            currentPositions: positions,
                        }) =>
                            OperationRealTimeUtil.generateOperationTableData(
                                operations,
                                sightings,
                                positions
                            )
                    )
                )
        );

        this.state.connect(
            'todaysCalendarId',
            this.todaysCalendarListStateQuery.todaysCalendarId$
        );

        this.state.connect(
            'stations',
            this.routeStationListStateQuery.stations$
        );

        this.state.connect(
            'tripClasses',
            this.operationRealTimeStateQuery.tripClasses$
        );

        this.state.connect(
            'operations',
            this.operationRealTimeStateQuery.operations$
        );

        this.state.connect(
            'latestOperationSightings',
            this.operationRealTimeStateQuery.latestSightings$.pipe(
                pluck('operationSightings')
            )
        );

        this.state.connect(
            'currentPositions',
            this.operationRealTimeStateQuery.currentPositions$
        );

        this.state.connect(
            'isVisibleCurrentPosition',
            this.operationRealTimeStateQuery.isVisibleCurrentPosition$
        );
    }
}
