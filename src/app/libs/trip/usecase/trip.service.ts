import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { Pagination } from 'src/app/core/utils/pagination';
import { TripQuery } from '../infrastructure/queries/trip.query';
import { TripDetailsDto } from './dtos/trip-details.dto';

@Injectable({ providedIn: 'root' })
export class TripService {
    constructor(private readonly tripQuery: TripQuery) {}

    findMany(
        qb: RequestQueryBuilder
    ): Observable<Pagination<TripDetailsDto> | TripDetailsDto[]> {
        return this.tripQuery.findMany(qb);
    }
}
