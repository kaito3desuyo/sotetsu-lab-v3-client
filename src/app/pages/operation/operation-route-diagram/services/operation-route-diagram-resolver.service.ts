import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { OperationRouteDiagramService } from './operation-route-diagram.service';
import { map } from 'rxjs/operators';
import { OperationRouteDiagramStateStore } from '../states/operation-route-diagram.state';

@Injectable()
export class OperationRouteDiagramResolverService
    
{
    constructor(
        private readonly operationRouteDiagramService: OperationRouteDiagramService,
        private readonly operationRouteDiagramStateStore: OperationRouteDiagramStateStore
    ) {}

    resolve(route: ActivatedRouteSnapshot): Observable<void> {
        const operationId: string = route.paramMap.get('operation_id');
        this.operationRouteDiagramStateStore.setOperationId(operationId);

        return forkJoin([
            this.operationRouteDiagramService.fetchOperationTrips(),
            this.operationRouteDiagramService.fetchStationsV2(),
        ]).pipe(map(() => null));
    }
}
