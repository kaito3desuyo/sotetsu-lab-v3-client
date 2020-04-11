import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { IOperationSighting } from '../interfaces/operation-sighting';
import { OperationApiService } from '../api/operation-api.service';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class OperationResolverService {
    constructor() {}
}

@Injectable({
    providedIn: 'root',
})
export class OperationsAllNumbersResolverService
    implements Resolve<{ operationNumber: string }[]> {
    constructor(private api: OperationApiService) {}

    resolve(): Observable<{ operationNumber: string }[]> {
        return this.api.getOperationsAllNumbers();
    }
}

@Injectable({
    providedIn: 'root',
})
export class OperationsAllLatestSightingsResolverService
    implements Resolve<IOperationSighting[]> {
    constructor(private api: OperationApiService) {}

    resolve(): Observable<IOperationSighting[]> {
        return this.api.getOperationsAllLatestSightings();
    }
}
