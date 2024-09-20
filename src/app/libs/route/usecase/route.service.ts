import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { Pagination } from 'src/app/core/utils/pagination';
import { RouteQuery } from '../infrastructure/queries/route.query';
import { RouteDetailsDto } from './dtos/route-details.dto';

@Injectable({ providedIn: 'root' })
export class RouteService {
    constructor(private readonly routeQuery: RouteQuery) {}

    findMany(
        qb: RequestQueryBuilder,
    ): Observable<Pagination<RouteDetailsDto> | RouteDetailsDto[]> {
        return this.routeQuery.findMany(qb);
    }
}
