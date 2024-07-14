import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { OperationRouteDiagramStateStore } from '../states/operation-route-diagram.state';
import { OperationRouteDiagramService } from './operation-route-diagram.service';

@Injectable()
export class OperationRouteDiagramResolverService {
    readonly #operationRouteDiagramService = inject(
        OperationRouteDiagramService
    );
    readonly #operationRouteDiagramStateStore = inject(
        OperationRouteDiagramStateStore
    );

    resolve(route: ActivatedRouteSnapshot): Observable<void> {
        const operationId: string = route.paramMap.get('operation_id');
        this.#operationRouteDiagramStateStore.setOperationId(operationId);

        if (!operationId) {
            return of(undefined);
        }

        return forkJoin([
            this.#operationRouteDiagramService.fetchOperationTrips(),
            this.#operationRouteDiagramService.fetchStations(),
        ]).pipe(map(() => undefined));
    }
}
