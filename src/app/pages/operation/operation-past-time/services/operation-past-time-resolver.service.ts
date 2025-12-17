import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';
import { filter, first, map, mergeMap } from 'rxjs/operators';
import { TitleService } from 'src/app/core/services/title.service';
import { InitializeStateQuery } from 'src/app/global-states/initialize.state';
import { OperationPastTimeStateStore } from '../states/operation-past-time.state';
import { OperationPastTimeService } from './operation-past-time.service';

@Injectable()
export class OperationPastTimeResolverService {
    readonly #titleService = inject(TitleService);
    readonly #initializeStateQuery = inject(InitializeStateQuery);
    readonly #operationPastTimeService = inject(OperationPastTimeService);
    readonly #operationPastTimeStateStore = inject(OperationPastTimeStateStore);

    resolve(route: ActivatedRouteSnapshot): Observable<void> {
        const title = route.data.title;
        const referenceDate = route.paramMap.get('reference_date') ?? undefined;
        const days = route.paramMap.get('days') ?? undefined;
        const includeInvalidated =
            route.paramMap.get('include_invalidated') ?? undefined;

        this.#titleService.setTitle(title);
        this.#operationPastTimeStateStore.setReferenceDate(referenceDate);
        this.#operationPastTimeStateStore.setDays(days && +days);
        this.#operationPastTimeStateStore.setIncludeInvalidated(
            includeInvalidated === 'true',
        );

        return of(undefined).pipe(
            mergeMap(() =>
                this.#initializeStateQuery.isInitialized$.pipe(
                    filter((bool) => !!bool),
                    first(),
                ),
            ),
            mergeMap(() =>
                forkJoin([
                    this.#operationPastTimeService.fetchCalendarByDate(),
                    this.#operationPastTimeService.fetchFormationsV2(),
                    // this.#operationPastTimeService.fetchOperationSightingsV2(),

                    this.#operationPastTimeService.fetchOperationsV3(),
                    this.#operationPastTimeService.fetchOperationSightingsV3(),
                ]),
            ),
            map(() => undefined),
        );
    }
}
