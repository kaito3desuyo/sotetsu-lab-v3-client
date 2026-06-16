import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { md5 } from 'js-md5';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
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
    readonly #v3ApiUrl = environment.apiUrl + '/v3/routes';
    #obs: Record<string, Observable<any>> = {};

    findMany_V3(params?: {
        serviceName?: string;
        forceReload?: boolean;
    }): Observable<RouteDetailsDto[]> {
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
                .get<RouteModel[]>(this.#v3ApiUrl, {
                    params: httpParams,
                    observe: 'response',
                })
                .pipe(
                    shareReplay({ bufferSize: 1, refCount: true }),
                    map((res) =>
                        res.body.map((o) => buildRouteDetailsDto(o)),
                    ),
                );
        }

        return this.#obs[key];
    }

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
