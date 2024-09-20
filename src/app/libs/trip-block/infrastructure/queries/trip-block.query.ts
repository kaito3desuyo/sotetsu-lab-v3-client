import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Pagination } from 'src/app/core/utils/pagination';
import { environment } from 'src/environments/environment';
import { TripBlockDetailsDto } from '../../usecase/dtos/trip-block-details.dto';
import { buildTripBlockDetailsDto } from '../builders/trip-block-dto.builder';
import { TripBlockModel } from '../models/trip-block.model';

@Injectable({ providedIn: 'root' })
export class TripBlockQuery {
    private readonly apiUrl = environment.apiUrl + '/v2/trip-blocks';

    constructor(private readonly http: HttpClient) {}

    findMany(
        qb: RequestQueryBuilder,
    ): Observable<Pagination<TripBlockDetailsDto> | TripBlockDetailsDto[]> {
        const httpParams = new HttpParams({ fromString: qb.query() });

        return this.http
            .get<TripBlockModel[]>(this.apiUrl, {
                params: httpParams,
                observe: 'response',
            })
            .pipe(
                map((res) => {
                    return Pagination.isApiPaginated(res)
                        ? Pagination.create(
                              res.body.map((o) => buildTripBlockDetailsDto(o)),
                              Pagination.getApiPageSettings(res),
                          )
                        : res.body.map((o) => buildTripBlockDetailsDto(o));
                }),
            );
    }

    findOne(
        tripBlockId: string,
        qb: RequestQueryBuilder,
    ): Observable<TripBlockDetailsDto> {
        const httpParams = new HttpParams({ fromString: qb.query() });

        return this.http
            .get<TripBlockModel>(this.apiUrl + '/' + tripBlockId, {
                params: httpParams,
            })
            .pipe(
                map((data) => {
                    return buildTripBlockDetailsDto(data);
                }),
            );
    }
}
