import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FormationQuery } from '../infrastructure/queries/formation.query';
import { FormationDetailsDto } from './dtos/formation-details.dto';

@Injectable({ providedIn: 'root' })
export class FormationService {
    constructor(private readonly formationQuery: FormationQuery) {}

    findManyBySpecificDate(params: {
        date: string;
        forceReload?: boolean;
    }): Observable<FormationDetailsDto[]> {
        return this.formationQuery.findManyBySpecificDate(params);
    }

    findManyBySpecificPeriod(params: {
        startDate: string;
        endDate: string;
        forceReload?: boolean;
    }): Observable<FormationDetailsDto[]> {
        return this.formationQuery.findManyBySpecificPeriod(params);
    }
}
