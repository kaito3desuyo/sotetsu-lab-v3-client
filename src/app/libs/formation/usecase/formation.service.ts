import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { Pagination } from 'src/app/core/utils/pagination';
import { FormationQuery } from '../infrastructure/queries/formation.query';
import { FormationDetailsDto } from './dtos/formation-details.dto';

@Injectable({ providedIn: 'root' })
export class FormationService {
    constructor(private readonly formationQuery: FormationQuery) {}

    findManyBySpeficicDate(
        qb: RequestQueryBuilder,
        params: { date: string },
    ): Observable<Pagination<FormationDetailsDto> | FormationDetailsDto[]> {
        return this.formationQuery.findManyBySpeficicDate(qb, params);
    }

    findManyBySpecificPeriod(
        qb: RequestQueryBuilder,
        params: { startDate: string; endDate: string },
    ): Observable<Pagination<FormationDetailsDto> | FormationDetailsDto[]> {
        return this.formationQuery.findManyBySpecificPeriod(qb, params);
    }
}
