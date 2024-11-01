import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Pagination } from 'src/app/core/utils/pagination';
import { environment } from 'src/environments/environment';
import { RouteDetailsDto } from '../../usecase/dtos/route-details.dto';
import { buildRouteDetailsDto } from '../builders/route-dto.builder';
import { RouteModel } from '../models/route.model';

@Injectable({ providedIn: 'root' })
export class RouteQuery {
    readonly #http = inject(HttpClient);
    readonly #apiUrl = environment.apiUrl + '/v2/routes';

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
}
