import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { Pagination } from 'src/app/core/utils/pagination';
import { TripClassQuery } from '../infrastructure/queries/trip-class.query';
import { TripClassDetailsDto } from './dtos/trip-class-details.dto';

@Injectable({ providedIn: 'root' })
export class TripClassService {
    constructor(private readonly tripClassQuery: TripClassQuery) {}

    findMany(
        qb: RequestQueryBuilder,
    ): Observable<Pagination<TripClassDetailsDto> | TripClassDetailsDto[]> {
        return this.tripClassQuery.findMany(qb);
    }

    // v3

    findMany_V3(params: {
        forceReload?: boolean;
    }): Observable<TripClassDetailsDto[]> {
        return this.tripClassQuery.findMany_V3(params);
    }
}
