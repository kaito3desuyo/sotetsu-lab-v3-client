import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ServiceQuery } from '../infrastructure/queries/service.query';
import { ServiceAgenciesDto } from './dtos/service-agencies.dto';
import { ServiceDetailsDto } from './dtos/service-details.dto';
import { ServiceRoutesDto } from './dtos/service-routes.dto';
import { ServiceStationsDto } from './dtos/service-stations.dto';

@Injectable({ providedIn: 'root' })
export class ServiceService {
    constructor(private readonly serviceQuery: ServiceQuery) {}

    findMany(params?: {
        serviceName?: string;
        forceReload?: boolean;
    }): Observable<ServiceDetailsDto[]> {
        return this.serviceQuery.findMany(params);
    }

    findOneWithStations(params: {
        serviceId: string;
        forceReload?: boolean;
    }): Observable<ServiceStationsDto> {
        return this.serviceQuery.findOneWithStations(params);
    }

    findOneWithAgencies(params: {
        serviceId: string;
        forceReload?: boolean;
    }): Observable<ServiceAgenciesDto> {
        return this.serviceQuery.findOneWithAgencies(params);
    }

    findOneWithRoutes(params: {
        serviceId: string;
        forceReload?: boolean;
    }): Observable<ServiceRoutesDto> {
        return this.serviceQuery.findOneWithRoutes(params);
    }
}
