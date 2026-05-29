import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { Pagination } from 'src/app/core/utils/pagination';
import { ServiceQuery } from '../infrastructure/queries/service.query';
import { ServiceAgenciesDto } from './dtos/service-agencies.dto';
import { ServiceDetailsDto } from './dtos/service-details.dto';
import { ServiceRoutesDto } from './dtos/service-routes.dto';
import { ServiceStationsDto } from './dtos/service-stations.dto';

@Injectable({ providedIn: 'root' })
export class ServiceService {
    constructor(private readonly serviceQuery: ServiceQuery) {}

    findMany(
        qb: RequestQueryBuilder,
    ): Observable<Pagination<ServiceDetailsDto> | ServiceDetailsDto[]> {
        return this.serviceQuery.findMany(qb);
    }

    findOneWithStations(
        serviceId: string,
        qb: RequestQueryBuilder,
    ): Observable<ServiceStationsDto> {
        return this.serviceQuery.findOneWithStations(serviceId, qb);
    }

    // v3

    findOneWithAgencies_V3(params: {
        serviceId: string;
        forceReload?: boolean;
    }): Observable<ServiceAgenciesDto> {
        return this.serviceQuery.findOneWithAgencies_V3(params);
    }

    findOneWithRoutes_V3(params: {
        serviceId: string;
        forceReload?: boolean;
    }): Observable<ServiceRoutesDto> {
        return this.serviceQuery.findOneWithRoutes_V3(params);
    }
}
