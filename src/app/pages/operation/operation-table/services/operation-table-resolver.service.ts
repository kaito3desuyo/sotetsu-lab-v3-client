import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TitleService } from 'src/app/core/services/title.service';
import { OperationTableStateStore } from '../states/operation-table.state';
import { OperationTableService } from './operation-table.service';

@Injectable()
export class OperationTableResolverService {
    readonly #titleService = inject(TitleService);
    readonly #operationTableService = inject(OperationTableService);
    readonly #operationTableStateStore = inject(OperationTableStateStore);

    resolve(route: ActivatedRouteSnapshot): Observable<void> {
        const title = route.data.title;
        const calendarId = route.paramMap.get('calendar_id');

        this.#titleService.setTitle(title);
        this.#operationTableStateStore.setCalendarId(calendarId ?? '');

        return forkJoin([
            this.#operationTableService.fetchOperationTrips(),
            this.#operationTableService.fetchStations(),
            this.#operationTableService.fetchTripClass(),
        ]).pipe(map(() => undefined));
    }
}
