import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { md5 } from 'js-md5';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { buildStationDetailsDto } from 'src/app/libs/station/infrastructure/builders/station-dto.builder';
import { environment } from 'src/environments/environment';
import { ServiceAgenciesDto } from '../../usecase/dtos/service-agencies.dto';
import { ServiceDetailsDto } from '../../usecase/dtos/service-details.dto';
import { ServiceRoutesDto } from '../../usecase/dtos/service-routes.dto';
import { ServiceStationsDto } from '../../usecase/dtos/service-stations.dto';
import { ServiceAgenciesDtoBuilder } from '../builders/service-agencies.dto.builder';
import {
    buildServiceDetailsDto,
    ServiceDtoBuilder,
} from '../builders/service-dto.builder';
import { ServiceAgenciesModel } from '../models/service-agencies.model';
import { ServiceRoutesModel } from '../models/service-routes.model';
import { ServiceStationsModel } from '../models/service-stations.model';
import { ServiceModel } from '../models/service.model';

@Injectable({ providedIn: 'root' })
export class ServiceQuery {
    readonly #http = inject(HttpClient);
    readonly #v3ApiUrl = environment.apiUrl + '/v3/services';
    #obs: Record<string, Observable<any>> = {};

    findMany_V3(params?: {
        serviceName?: string;
        forceReload?: boolean;
    }): Observable<ServiceDetailsDto[]> {
        const { serviceName, forceReload } = params ?? {};
        const key = md5(JSON.stringify({ name: 'findMany', serviceName }));

        if (forceReload) {
            this.#obs[key] = undefined;
        }

        if (!this.#obs[key]) {
            const httpParams = new HttpParams(
                serviceName ? { fromObject: { serviceName } } : {},
            );
            this.#obs[key] = this.#http
                .get<ServiceModel[]>(this.#v3ApiUrl, {
                    params: httpParams,
                    observe: 'response',
                })
                .pipe(
                    shareReplay({ bufferSize: 1, refCount: true }),
                    map((res) =>
                        res.body.map((o) => buildServiceDetailsDto(o)),
                    ),
                );
        }

        return this.#obs[key];
    }

    findOneWithStations_V3(params: {
        serviceId: string;
        forceReload?: boolean;
    }): Observable<ServiceStationsDto> {
        const { serviceId, forceReload } = params;

        const key = md5(
            JSON.stringify({ name: 'findOneWithStations', serviceId }),
        );

        if (forceReload) {
            this.#obs[key] = undefined;
        }

        if (!this.#obs[key]) {
            this.#obs[key] = this.#http
                .get<ServiceStationsModel>(
                    `${this.#v3ApiUrl}/${serviceId}/stations`,
                    { observe: 'response' },
                )
                .pipe(
                    shareReplay({ bufferSize: 1, refCount: true }),
                    map((res) => ({
                        service: buildServiceDetailsDto(res.body.service),
                        stations: res.body.stations.map((o) =>
                            buildStationDetailsDto(o),
                        ),
                    })),
                );
        }

        return this.#obs[key];
    }

    findOneWithAgencies_V3(params: {
        serviceId: string;
        forceReload?: boolean;
    }): Observable<ServiceAgenciesDto> {
        const { serviceId, forceReload } = params;

        const key = md5(
            JSON.stringify({
                name: 'findOneWithAgencies',
                serviceId,
            }),
        );

        if (forceReload) {
            this.#obs[key] = undefined;
        }

        if (!this.#obs[key]) {
            this.#obs[key] = this.#http
                .get<ServiceAgenciesModel>(
                    `${this.#v3ApiUrl}/${serviceId}/agencies`,
                    {
                        observe: 'response',
                    },
                )
                .pipe(
                    shareReplay({ bufferSize: 1, refCount: true }),
                    map((res) =>
                        ServiceAgenciesDtoBuilder.buildFromModel(res.body),
                    ),
                );
        }

        return this.#obs[key];
    }

    findOneWithRoutes_V3(params: {
        serviceId: string;
        forceReload?: boolean;
    }): Observable<ServiceRoutesDto> {
        const { serviceId, forceReload } = params;

        const key = md5(
            JSON.stringify({
                name: 'findOneWithRoutes',
                serviceId,
            }),
        );

        if (forceReload) {
            this.#obs[key] = undefined;
        }

        if (!this.#obs[key]) {
            this.#obs[key] = this.#http
                .get<ServiceRoutesModel>(
                    `${this.#v3ApiUrl}/${serviceId}/routes`,
                    { observe: 'response' },
                )
                .pipe(
                    shareReplay({ bufferSize: 1, refCount: true }),
                    map((res) => ServiceDtoBuilder.toRoutesDto(res.body)),
                );
        }

        return this.#obs[key];
    }
}
