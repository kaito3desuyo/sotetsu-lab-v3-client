import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { Pagination } from 'src/app/core/utils/pagination';
import { StationQuery } from '../infrastructure/queries/station.query';
import { StationDetailsDto } from './dtos/station-details.dto';

@Injectable({ providedIn: 'root' })
export class StationService {
    constructor(private readonly stationQuery: StationQuery) {}

    findMany(
        qb: RequestQueryBuilder
    ): Observable<Pagination<StationDetailsDto> | StationDetailsDto[]> {
        return this.stationQuery.findMany(qb);
    }
}
