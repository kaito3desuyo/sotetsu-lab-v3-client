import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Pagination } from 'src/app/core/utils/pagination';
import { environment } from 'src/environments/environment';
import { TripDetailsDto } from '../../usecase/dtos/trip-details.dto';
import { buildTripDetailsDto } from '../builders/trip-dto.builder';
import { TripModel } from '../models/trip.model';

@Injectable({ providedIn: 'root' })
export class TripQuery {
    private readonly apiUrl = environment.apiUrl + '/v2/trips';

    constructor(private readonly http: HttpClient) {}

    findMany(
        qb: RequestQueryBuilder
    ): Observable<Pagination<TripDetailsDto> | TripDetailsDto[]> {
        const httpParams = new HttpParams({ fromString: qb.query() });

        return this.http
            .get<TripModel[]>(this.apiUrl, {
                params: httpParams,
                observe: 'response',
            })
            .pipe(
                map((res) => {
                    return Pagination.isApiPaginated(res)
                        ? Pagination.create(
                              res.body.map((o) => buildTripDetailsDto(o)),
                              Pagination.getApiPageSettings(res)
                          )
                        : res.body.map((o) => buildTripDetailsDto(o));
                })
            );
    }
}
