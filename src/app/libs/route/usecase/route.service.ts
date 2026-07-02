import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RouteQuery } from '../infrastructure/queries/route.query';
import { RouteDetailsDto } from './dtos/route-details.dto';
import { RouteStationsDto } from './dtos/route-stations.dto';

@Injectable({ providedIn: 'root' })
export class RouteService {
    constructor(private readonly routeQuery: RouteQuery) {}

    findMany(params?: {
        serviceName?: string;
        forceReload?: boolean;
    }): Observable<RouteDetailsDto[]> {
        return this.routeQuery.findMany(params);
    }

    findOneWithStations(params: {
        routeId: string;
        forceReload?: boolean;
    }): Observable<RouteStationsDto> {
        return this.routeQuery.findOneWithStations(params);
    }
}
