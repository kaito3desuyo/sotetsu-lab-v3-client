import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { Pagination } from 'src/app/core/utils/pagination';
import { AgencyQuery } from '../infrastructure/queries/agency.query';
import { AgencyDetailsDto } from './dtos/agency-details.dto';

@Injectable({ providedIn: 'root' })
export class AgencyService {
    constructor(private readonly agencyQuery: AgencyQuery) {}

    findMany(
        qb: RequestQueryBuilder
    ): Observable<Pagination<AgencyDetailsDto> | AgencyDetailsDto[]> {
        return this.agencyQuery.findMany(qb);
    }
}
