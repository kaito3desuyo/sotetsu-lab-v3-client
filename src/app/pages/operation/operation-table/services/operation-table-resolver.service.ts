import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { OperationTableStateStore } from '../states/operation-table.state';
import { OperationTableService } from './operation-table.service';

@Injectable()
export class OperationTableResolverService {
    readonly #operationTableService = inject(OperationTableService);
    readonly #operationTableStateStore = inject(OperationTableStateStore);

    resolve(route: ActivatedRouteSnapshot): Observable<void> {
        const calendarId = route.paramMap.get('calendar_id');

        if (!calendarId) {
            return of(null);
        }

        this.#operationTableStateStore.setCalendarId(calendarId);

        return of(null).pipe(
            mergeMap(() =>
                forkJoin([
                    this.#operationTableService.fetchOperationTrips(),
                    this.#operationTableService.fetchStations(),
                    this.#operationTableService.fetchTripClass(),
                ]),
            ),
            map(() => undefined),
        );
    }
}
