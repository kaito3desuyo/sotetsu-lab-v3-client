import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { OperationTableStateStore } from '../states/operation-table.state';
import { OperationTableService } from './operation-table.service';

@Injectable()
export class OperationTableResolverService
    implements Resolve<Observable<void>>
{
    constructor(
        private readonly operationTableService: OperationTableService,
        private readonly operationTableStateStore: OperationTableStateStore
    ) {}

    resolve(route: ActivatedRouteSnapshot): Observable<void> {
        const calendarId = route.paramMap.get('calendar_id');

        if (!calendarId) {
            return of(null);
        }

        this.operationTableStateStore.setCalendarId(calendarId);

        return of(null).pipe(
            mergeMap(() =>
                forkJoin([
                    this.operationTableService.fetchStationsV2(),
                    this.operationTableService.fetchTripClassV2(),
                    this.operationTableService.fetchOperationsByCalendarId(),
                ])
            ),
            mergeMap(() =>
                forkJoin([this.operationTableService.fetchAllOperationTrips()])
            ),
            map(() => null)
        );
    }
}