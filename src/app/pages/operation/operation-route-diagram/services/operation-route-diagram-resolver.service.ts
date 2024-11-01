import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';
import { filter, first, map, mergeMap } from 'rxjs/operators';
import { OperationRouteDiagramStateStore } from '../states/operation-route-diagram.state';
import { OperationRouteDiagramService } from './operation-route-diagram.service';
import { TitleService } from 'src/app/core/services/title.service';
import { InitializeStateQuery } from 'src/app/global-states/initialize.state';

@Injectable()
export class OperationRouteDiagramResolverService {
    readonly #titleService = inject(TitleService);
    readonly #initializeStateQuery = inject(InitializeStateQuery);
    readonly #operationRouteDiagramService = inject(
        OperationRouteDiagramService,
    );
    readonly #operationRouteDiagramStateStore = inject(
        OperationRouteDiagramStateStore,
    );

    resolve(route: ActivatedRouteSnapshot): Observable<void> {
        const title = route.data.title;
        const operationId: string = route.paramMap.get('operation_id');

        this.#titleService.setTitle(title);
        this.#operationRouteDiagramStateStore.setOperationId(operationId);

        if (!operationId) {
            return of(undefined);
        }

        return of(undefined).pipe(
            mergeMap(() =>
                this.#initializeStateQuery.isInitialized$.pipe(
                    filter((bool) => !!bool),
                    first(),
                ),
            ),
            mergeMap(() =>
                forkJoin([
                    this.#operationRouteDiagramService.fetchOperationTrips(),
                    this.#operationRouteDiagramService.fetchStations(),
                ]),
            ),
            map(() => undefined),
        );
    }
}
