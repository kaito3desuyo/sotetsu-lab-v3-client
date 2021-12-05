import { Component } from '@angular/core';
import { map } from 'rxjs/operators';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { OperationRealTimeStateQuery } from '../../states/operation-real-time.state';

@Component({
    selector: 'app-operation-real-time-main-c',
    templateUrl: './operation-real-time-main-c.component.html',
    styleUrls: ['./operation-real-time-main-c.component.scss'],
})
export class OperationRealTimeMainCComponent {
    readonly operations$ = this.operationRealTimeStateQuery.operations$;
    readonly formations$ = this.operationRealTimeStateQuery.formations$;
    readonly latestOperationSightings$ =
        this.operationRealTimeStateQuery.latestSightings$.pipe(
            map((o) => o.operationSightings)
        );
    readonly latestFormationSightings$ =
        this.operationRealTimeStateQuery.latestSightings$.pipe(
            map((o) => o.formationSightings)
        );
    readonly currentPositions$ =
        this.operationRealTimeStateQuery.currentPositions$;
    readonly todaysCalendarId$ =
        this.todaysCalendarListStateQuery.todaysCalendarId$;
    readonly stations$ = this.routeStationListStateQuery.stations$;
    readonly tripClasses$ = this.operationRealTimeStateQuery.tripClasses$;

    constructor(
        private readonly todaysCalendarListStateQuery: TodaysCalendarListStateQuery,
        private readonly routeStationListStateQuery: RouteStationListStateQuery,
        private readonly operationRealTimeStateQuery: OperationRealTimeStateQuery
    ) {}
}
