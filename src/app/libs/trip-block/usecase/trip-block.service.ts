import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { Pagination } from 'src/app/core/utils/pagination';
import { TripBlockQuery } from '../infrastructure/queries/trip-block.query';
import { TripBlockDetailsDto } from './dtos/trip-block-details.dto';

@Injectable({ providedIn: 'root' })
export class TripBlockService {
    constructor(private readonly tripBlockQuery: TripBlockQuery) {}

    findMany(
        qb: RequestQueryBuilder
    ): Observable<Pagination<TripBlockDetailsDto> | TripBlockDetailsDto[]> {
        return this.tripBlockQuery.findMany(qb);
    }
}
