import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AgencyQuery } from '../infrastructure/queries/agency.query';
import { AgencyDetailsDto } from './dtos/agency-details.dto';

@Injectable({ providedIn: 'root' })
export class AgencyService {
    constructor(private readonly agencyQuery: AgencyQuery) {}

    findMany(params?: {
        forceReload?: boolean;
    }): Observable<AgencyDetailsDto[]> {
        return this.agencyQuery.findMany(params);
    }
}
