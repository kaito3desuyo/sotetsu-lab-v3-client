import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { md5 } from 'js-md5';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { Pagination } from 'src/app/core/utils/pagination';
import { buildStationDetailsDto } from 'src/app/libs/station/infrastructure/builders/station-dto.builder';
import { environment } from 'src/environments/environment';
import { ServiceDetailsDto } from '../../usecase/dtos/service-details.dto';
import { ServiceRoutesDto } from '../../usecase/dtos/service-routes.dto';
import { ServiceStationsDto } from '../../usecase/dtos/service-stations.dto';
import {
    buildServiceDetailsDto,
    ServiceDtoBuilder,
} from '../builders/service-dto.builder';
import { ServiceRoutesModel } from '../models/service-routes.model';
import { ServiceStationsModel } from '../models/service-stations.model';
import { ServiceModel } from '../models/service.model';

@Injectable({ providedIn: 'root' })
export class ServiceQuery {
    readonly #http = inject(HttpClient);
    readonly #apiUrl = environment.apiUrl + '/v2/services';
    readonly #v3ApiUrl = environment.apiUrl + '/v3/services';
    #obs: Record<string, Observable<any>> = {};

    findMany(
        qb: RequestQueryBuilder,
    ): Observable<Pagination<ServiceDetailsDto> | ServiceDetailsDto[]> {
        const httpParams = new HttpParams({ fromString: qb.query() });

        return this.#http
            .get<ServiceModel[]>(this.#apiUrl, {
                params: httpParams,
                observe: 'response',
            })
            .pipe(
                map((res) => {
                    return Pagination.isApiPaginated(res)
                        ? Pagination.create(
                              res.body.map((o) => buildServiceDetailsDto(o)),
                              Pagination.getApiPageSettings(res),
                          )
                        : res.body.map((o) => buildServiceDetailsDto(o));
                }),
            );
    }

    findOneWithStations(
        serviceId: ServiceDetailsDto['serviceId'],
        qb: RequestQueryBuilder,
    ): Observable<ServiceStationsDto> {
        const httpParams = new HttpParams({ fromString: qb.query() });

        return this.#http
            .get<ServiceStationsModel>(
                this.#apiUrl + '/' + serviceId + '/stations',
                { params: httpParams },
            )
            .pipe(
                map((data) => {
                    return {
                        service: buildServiceDetailsDto(data.service),
                        stations: data.stations.map((o) =>
                            buildStationDetailsDto(o),
                        ),
                    };
                }),
            );
    }

    // v3

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
