import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';
import { filter, first, map, mergeMap } from 'rxjs/operators';
import { TitleService } from 'src/app/core/services/title.service';
import { InitializeStateQuery } from 'src/app/global-states/initialize.state';
import { OperationRealTimeService } from './operation-real-time.service';

@Injectable()
export class OperationRealTimeResolverService {
    readonly #titleService = inject(TitleService);
    readonly #initializeStateQuery = inject(InitializeStateQuery);
    readonly #operationRealTimeService = inject(OperationRealTimeService);

    resolve(route: ActivatedRouteSnapshot): Observable<void> {
        const title = route.data.title;

        this.#titleService.setTitle(title);

        return of(undefined).pipe(
            mergeMap(() =>
                this.#initializeStateQuery.isInitialized$.pipe(
                    filter((bool) => !!bool),
                    first(),
                ),
            ),
            mergeMap(() =>
                forkJoin([
                    // v2
                    this.#operationRealTimeService.fetchOperationSightingTimeCrossSections(),
                    this.#operationRealTimeService.fetchFormationSightingTimeCrossSections(),
                    this.#operationRealTimeService.fetchOperationSightingHistories(),
                    this.#operationRealTimeService.fetchFormationSightingHistories(),
                    this.#operationRealTimeService.fetchOperationCurrentPosition(),
                    this.#operationRealTimeService.fetchTripClassesV2(),
                ]),
            ),
            map(() => undefined),
        );
    }
}
