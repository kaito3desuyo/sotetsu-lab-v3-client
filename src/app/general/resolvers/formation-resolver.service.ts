import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { FormationApiService } from '../api/formation-api.service';
import { Observable } from 'rxjs';
import { IOperationSighting } from '../interfaces/operation-sighting';

@Injectable({
    providedIn: 'root'
})
export class FormationResolverService {
    constructor() {}
}

@Injectable({
    providedIn: 'root'
})
export class FormationsAllNumbersResolverService
    implements Resolve<{ formationNumber: string }[]> {
    constructor(private api: FormationApiService) {}

    resolve(
        route: ActivatedRouteSnapshot
    ): Observable<{ formationNumber: string }[]> {
        const date: string = route.data.date;
        return this.api.getFormationsAllNumbers(date);
    }
}

@Injectable({
    providedIn: 'root'
})
export class FormationsAllLatestSightingsResolverService
    implements Resolve<IOperationSighting[]> {
    constructor(private api: FormationApiService) {}

    resolve(): Observable<IOperationSighting[]> {
        return this.api.getFormationsAllLatestSightings();
    }
}
