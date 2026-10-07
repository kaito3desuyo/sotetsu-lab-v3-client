import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { QueryCache } from 'src/app/core/query-cache/query-cache';
import { StationDtoBuilder } from 'src/app/libs/station/infrastructure/builders/station.dto.builder';
import { environment } from 'src/environments/environment';
import { ServiceAgenciesDto } from '../../usecase/dtos/service-agencies.dto';
import { ServiceDetailsDto } from '../../usecase/dtos/service-details.dto';
import { ServiceRoutesDto } from '../../usecase/dtos/service-routes.dto';
import { ServiceStationsDto } from '../../usecase/dtos/service-stations.dto';
import { ServiceAgenciesDtoBuilder } from '../builders/service-agencies.dto.builder';
import { ServiceDtoBuilder } from '../builders/service.dto.builder';
import { ServiceRoutesDtoBuilder } from '../builders/service-routes.dto.builder';
import { ServiceAgenciesModel } from '../models/service-agencies.model';
import { ServiceRoutesModel } from '../models/service-routes.model';
import { ServiceStationsModel } from '../models/service-stations.model';
import { ServiceModel } from '../models/service.model';

@Injectable({ providedIn: 'root' })
export class ServiceQuery {
    readonly #http = inject(HttpClient);
    readonly #v3ApiUrl = environment.apiUrl + '/v3/services';
    readonly #cache = new QueryCache();

    findMany(params?: {
        serviceName?: string;
        forceReload?: boolean;
    }): Observable<ServiceDetailsDto[]> {
        const { serviceName, forceReload } = params ?? {};

        return this.#cache
            .get({
                name: 'findMany',
                params: { serviceName },
                fetch: () => {
                    const httpParams = new HttpParams(
                        serviceName ? { fromObject: { serviceName } } : {},
                    );
                    return this.#http.get<ServiceModel[]>(this.#v3ApiUrl, {
                        params: httpParams,
                        observe: 'response',
                    });
                },
                forceReload,
            })
            .pipe(
                map((res) =>
                    res.body.map((o) => ServiceDtoBuilder.buildFromModel(o)),
                ),
            );
    }

    findOneWithStations(params: {
        serviceId: string;
        forceReload?: boolean;
    }): Observable<ServiceStationsDto> {
        const { serviceId, forceReload } = params;

        return this.#cache
            .get({
                name: 'findOneWithStations',
                params: { serviceId },
                fetch: () =>
                    this.#http.get<ServiceStationsModel>(
                        `${this.#v3ApiUrl}/${serviceId}/stations`,
                        { observe: 'response' },
                    ),
                forceReload,
            })
            .pipe(
                map((res) => ({
                    service: ServiceDtoBuilder.buildFromModel(res.body.service),
                    stations: res.body.stations.map((o) =>
                        StationDtoBuilder.buildFromModel(o),
                    ),
                })),
            );
    }

    findOneWithAgencies(params: {
        serviceId: string;
        forceReload?: boolean;
    }): Observable<ServiceAgenciesDto> {
        const { serviceId, forceReload } = params;

        return this.#cache
            .get({
                name: 'findOneWithAgencies',
                params: { serviceId },
                fetch: () =>
                    this.#http.get<ServiceAgenciesModel>(
                        `${this.#v3ApiUrl}/${serviceId}/agencies`,
                        { observe: 'response' },
                    ),
                forceReload,
            })
            .pipe(
                map((res) =>
                    ServiceAgenciesDtoBuilder.buildFromModel(res.body),
                ),
            );
    }

    findOneWithRoutes(params: {
        serviceId: string;
        forceReload?: boolean;
    }): Observable<ServiceRoutesDto> {
        const { serviceId, forceReload } = params;

        return this.#cache
            .get({
                name: 'findOneWithRoutes',
                params: { serviceId },
                fetch: () =>
                    this.#http.get<ServiceRoutesModel>(
                        `${this.#v3ApiUrl}/${serviceId}/routes`,
                        { observe: 'response' },
                    ),
                forceReload,
            })
            .pipe(
                map((res) => ServiceRoutesDtoBuilder.buildFromModel(res.body)),
            );
    }
}
