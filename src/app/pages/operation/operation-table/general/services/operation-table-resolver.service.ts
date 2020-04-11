import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { OperationTableService } from './operation-table.service';
import { map } from 'rxjs/operators';

@Injectable()
export class OperationTableResolverService
    implements Resolve<Observable<void>> {
    constructor(private operationTableService: OperationTableService) {}

    resolve(route: ActivatedRouteSnapshot): Observable<void> {
        const calendarId = route.paramMap.get('calendar_id');
        this.operationTableService.calendarId = calendarId;

        return forkJoin([
            this.operationTableService.fetchCalendars(),
            this.operationTableService.fetchOperationTrips(),
            this.operationTableService.fetchStations(),
            this.operationTableService.fetchTripClasses(),
            this.operationTableService.fetchCalendar(),
        ]).pipe(map(() => null));
    }
}
