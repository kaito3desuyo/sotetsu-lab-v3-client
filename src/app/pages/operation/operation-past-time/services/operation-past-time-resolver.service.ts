import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { OperationPastTimeStateStore } from '../states/operation-past-time.state';
import { OperationPastTimeService } from './operation-past-time.service';

@Injectable()
export class OperationPastTimeResolverService {
    readonly #operationPastTimeService = inject(OperationPastTimeService);
    readonly #operationPastTimeStateStore = inject(OperationPastTimeStateStore);

    resolve(route: ActivatedRouteSnapshot): Observable<void> {
        this.#operationPastTimeStateStore.setReferenceDate(
            route.paramMap.get('reference_date') ?? undefined,
        );
        this.#operationPastTimeStateStore.setDays(
            route.paramMap.get('days')
                ? +route.paramMap.get('days')
                : undefined,
        );

        return forkJoin([
            this.#operationPastTimeService.fetchCalendarByDate(),
            this.#operationPastTimeService.fetchFormationsV2(),
            this.#operationPastTimeService.fetchOperationSightingsV2(),
        ]).pipe(map(() => undefined));
    }
}
