import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { OperationTableService } from './operation-table.service';
import { map, switchMap } from 'rxjs/operators';
import { OperationTableStateStore } from '../../states/operation-table.state';

@Injectable()
export class OperationTableResolverService
    implements Resolve<Observable<void>>
{
    constructor(
        private operationTableService: OperationTableService,
        private readonly operationTableStateStore: OperationTableStateStore
    ) {}

    resolve(route: ActivatedRouteSnapshot): Observable<void> {
        const calendarId = route.paramMap.get('calendar_id');

        if (!calendarId) {
            return of(undefined);
        }

        this.operationTableService.calendarId = calendarId;
        this.operationTableStateStore.setCalendarId(calendarId);

        return forkJoin([
            // this.operationTableService.fetchCalendars(),
            // this.operationTableService.fetchOperationTrips(),
            this.operationTableService.fetchStations(),
            this.operationTableService.fetchTripClasses(),
            // this.operationTableService.fetchCalendar(),
            // v2
            this.operationTableService
                .fetchOperationsByCalendarId()
                .pipe(
                    switchMap(() =>
                        this.operationTableService.fetchAllOperationTrips()
                    )
                ),
        ]).pipe(map(() => null));
    }
}
