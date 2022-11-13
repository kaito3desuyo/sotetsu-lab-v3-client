import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Pagination } from 'src/app/core/utils/pagination';
import { environment } from 'src/environments/environment';
import { CreateTripBlockDto } from '../../usecase/dtos/create-trip-block.dto';
import { TripBlockDetailsDto } from '../../usecase/dtos/trip-block-details.dto';
import { buildTripBlockDetailsDto } from '../builders/trip-block-dto.builder';
import { TripBlockModel } from '../models/trip-block.model';

@Injectable({ providedIn: 'root' })
export class TripBlockCommand {
    private readonly apiUrl = environment.apiUrl + '/v2/trip-blocks';

    constructor(private readonly http: HttpClient) {}

    createMany(
        qb: RequestQueryBuilder,
        body: CreateTripBlockDto[]
    ): Observable<Pagination<TripBlockDetailsDto> | TripBlockDetailsDto[]> {
        const httpParams = new HttpParams({ fromString: qb.query() });

        return this.http
            .post<TripBlockModel[]>(this.apiUrl + '/bulk', body, {
                params: httpParams,
                observe: 'response',
            })
            .pipe(
                map((res) => {
                    return Pagination.isApiPaginated(res)
                        ? Pagination.create(
                              res.body.map((o) => buildTripBlockDetailsDto(o)),
                              Pagination.getApiPageSettings(res)
                          )
                        : res.body.map((o) => buildTripBlockDetailsDto(o));
                })
            );
    }
}
