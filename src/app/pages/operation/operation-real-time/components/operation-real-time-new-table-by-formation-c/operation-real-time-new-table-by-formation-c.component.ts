import { RxPush } from '@rx-angular/template/push';
import { RxLet } from '@rx-angular/template/let';
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RxState, selectSlice } from '@rx-angular/state';
import { map, pluck } from 'rxjs/operators';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationSightingWithCirculatedDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-with-circulated.dto';
import { OperationCurrentPositionDto } from 'src/app/libs/operation/usecase/dtos/operation-current-position.dto';
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
    formations: FormationDetailsDto[];
    latestFormationSightings: OperationSightingWithCirculatedDto[];
    currentPositions: OperationCurrentPositionDto[];
    isVisibleCurrentPosition: boolean;
};

@Component({
    standalone: true,
    selector: 'app-operation-real-time-new-table-by-formation-c',
    templateUrl:
        './operation-real-time-new-table-by-formation-c.component.html',
    styleUrls: [
        './operation-real-time-new-table-by-formation-c.component.scss',
    ],
    imports: [CommonModule, RxLet, RxPush, OperationRealTimeNewTablePComponent],
    providers: [RxState],
})
export class OperationRealTimeNewTableByFormationCComponent {
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
        this.state.connect(
            'displayedColumns',
            this.state.select('isVisibleCurrentPosition').pipe(
                map((bool) => {
                    if (bool) {
                        return [
                            'formationNumber',
                            'operationNumber',
                            'currentPosition',
                            'sightingTime',
                            'updatedAt',
                        ] as OperationRealTimeTableColumn[];
                    } else {
                        return [
                            'formationNumber',
                            'operationNumber',
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
                        'formations',
                        'latestFormationSightings',
                        'currentPositions',
                    ])
                )
                .pipe(
                    map(
                        ({
                            formations: formations,
                            latestFormationSightings: sightings,
                            currentPositions: positions,
                        }) =>
                            OperationRealTimeUtil.generateFormationTableData(
                                formations,
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
            'formations',
            this.operationRealTimeStateQuery.formations$
        );

        this.state.connect(
            'latestFormationSightings',
            this.operationRealTimeStateQuery.latestSightings$.pipe(
                pluck('formationSightings')
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
