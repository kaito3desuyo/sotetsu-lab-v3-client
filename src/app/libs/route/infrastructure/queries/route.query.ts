import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { QueryCache } from 'src/app/core/query-cache/query-cache';
import { environment } from 'src/environments/environment';
import { RouteDetailsDto } from '../../usecase/dtos/route-details.dto';
import { RouteStationsDto } from '../../usecase/dtos/route-stations.dto';
import { RouteDtoBuilder } from '../builders/route.dto.builder';
import { RouteStationsDtoBuilder } from '../builders/route-stations.dto.builder';
import { RouteStationsModel } from '../models/route-stations.model';
import { RouteModel } from '../models/route.model';

@Injectable({ providedIn: 'root' })
export class RouteQuery {
    readonly #http = inject(HttpClient);
    readonly #v3ApiUrl = environment.apiUrl + '/v3/routes';
    readonly #cache = new QueryCache();

    findMany(params?: {
        serviceName?: string;
        forceReload?: boolean;
    }): Observable<RouteDetailsDto[]> {
        const { serviceName, forceReload } = params ?? {};

        return this.#cache
            .get({
                name: 'findMany',
                params: { serviceName },
                fetch: () => {
                    const httpParams = new HttpParams(
                        serviceName ? { fromObject: { serviceName } } : {},
                    );
                    return this.#http.get<RouteModel[]>(this.#v3ApiUrl, {
                        params: httpParams,
                        observe: 'response',
                    });
                },
                forceReload,
            })
            .pipe(
                map((res) =>
                    res.body.map((o) => RouteDtoBuilder.buildFromModel(o)),
                ),
            );
    }

    findOneWithStations(params: {
        routeId: string;
        forceReload?: boolean;
    }): Observable<RouteStationsDto> {
        const { routeId, forceReload } = params;

        return this.#cache
            .get({
                name: 'findOneWithStations',
                params: { routeId },
                fetch: () =>
                    this.#http.get<RouteStationsModel>(
                        `${this.#v3ApiUrl}/${routeId}/stations`,
                        { observe: 'response' },
                    ),
                forceReload,
            })
            .pipe(
                map((res) => RouteStationsDtoBuilder.buildFromModel(res.body)),
            );
    }
}
