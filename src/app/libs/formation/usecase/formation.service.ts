import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FormationQuery } from '../infrastructure/queries/formation.query';
import { FormationDetailsDto } from './dtos/formation-details.dto';

@Injectable({ providedIn: 'root' })
export class FormationService {
    constructor(private readonly formationQuery: FormationQuery) {}

    findManyBySpecificDate_V3(params: {
        date: string;
        forceReload?: boolean;
    }): Observable<FormationDetailsDto[]> {
        return this.formationQuery.findManyBySpecificDate_V3(params);
    }

    findManyBySpecificPeriod_V3(params: {
        startDate: string;
        endDate: string;
        forceReload?: boolean;
    }): Observable<FormationDetailsDto[]> {
        return this.formationQuery.findManyBySpecificPeriod_V3(params);
    }
}
