import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { Pagination } from 'src/app/core/utils/pagination';
import { RouteQuery } from '../infrastructure/queries/route.query';
import { RouteDetailsDto } from './dtos/route-details.dto';
import { RouteStationsDto } from './dtos/route-stations.dto';

@Injectable({ providedIn: 'root' })
export class RouteService {
    constructor(private readonly routeQuery: RouteQuery) {}

    findMany(
        qb: RequestQueryBuilder,
    ): Observable<Pagination<RouteDetailsDto> | RouteDetailsDto[]> {
        return this.routeQuery.findMany(qb);
    }

    findOneWithStations_V3(params: {
        routeId: string;
        forceReload?: boolean;
    }): Observable<RouteStationsDto> {
        return this.routeQuery.findOneWithStations_V3(params);
    }
}
