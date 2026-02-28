import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { md5 } from 'js-md5';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { Pagination } from 'src/app/core/utils/pagination';
import { environment } from 'src/environments/environment';
import { RouteDetailsDto } from '../../usecase/dtos/route-details.dto';
import { RouteStationsDto } from '../../usecase/dtos/route-stations.dto';
import {
    buildRouteDetailsDto,
    RouteDtoBuilder,
} from '../builders/route-dto.builder';
import { RouteStationsModel } from '../models/route-stations.model';
import { RouteModel } from '../models/route.model';

@Injectable({ providedIn: 'root' })
export class RouteQuery {
    readonly #http = inject(HttpClient);
    readonly #apiUrl = environment.apiUrl + '/v2/routes';
    readonly #v3ApiUrl = environment.apiUrl + '/v3/routes';
    #obs: Record<string, Observable<any>> = {};

    findMany(
        qb: RequestQueryBuilder,
    ): Observable<Pagination<RouteDetailsDto> | RouteDetailsDto[]> {
        const httpParams = new HttpParams({ fromString: qb.query() });

        return this.#http
            .get<RouteModel[]>(this.#apiUrl, {
                params: httpParams,
                observe: 'response',
            })
            .pipe(
                map((res) => {
                    return Pagination.isApiPaginated(res)
                        ? Pagination.create(
                              res.body.map((o) => buildRouteDetailsDto(o)),
                              Pagination.getApiPageSettings(res),
                          )
                        : res.body.map((o) => buildRouteDetailsDto(o));
                }),
            );
    }

    // v3

    findOneWithStations_V3(params: {
        routeId: string;
        forceReload?: boolean;
    }): Observable<RouteStationsDto> {
        const { routeId, forceReload } = params;

        const key = md5(
            JSON.stringify({
                name: 'findOneWithStations',
                routeId,
            }),
        );

        if (forceReload) {
            this.#obs[key] = undefined;
        }

        if (!this.#obs[key]) {
            this.#obs[key] = this.#http
                .get<RouteStationsModel>(
                    `${this.#v3ApiUrl}/${routeId}/stations`,
                    {
                        observe: 'response',
                    },
                )
                .pipe(
                    shareReplay({ bufferSize: 1, refCount: true }),
                    map((res) => RouteDtoBuilder.toStationsDto(res.body)),
                );
        }

        return this.#obs[key];
    }
}
