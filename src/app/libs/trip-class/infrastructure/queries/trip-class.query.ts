import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Pagination } from 'src/app/core/utils/pagination';
import { environment } from 'src/environments/environment';
import { TripClassDetailsDto } from '../../usecase/dtos/trip-class-details.dto';
import { buildTripClassDetailsDto } from '../builders/trip-class-dto.builder';
import { TripClassModel } from '../models/trip-class.model';

@Injectable({ providedIn: 'root' })
export class TripClassQuery {
    private readonly apiUrl = environment.apiUrl + '/v2/trip-classes';

    constructor(private readonly http: HttpClient) {}

    findMany(
        qb: RequestQueryBuilder
    ): Observable<Pagination<TripClassDetailsDto> | TripClassDetailsDto[]> {
        const httpParams = new HttpParams({ fromString: qb.query() });

        return this.http
            .get<TripClassModel[]>(this.apiUrl, {
                params: httpParams,
                observe: 'response',
            })
            .pipe(
                map((res) => {
                    return Pagination.isApiPaginated(res)
                        ? Pagination.create(
                              res.body.map((o) => buildTripClassDetailsDto(o)),
                              Pagination.getApiPageSettings(res)
                          )
                        : res.body.map((o) => buildTripClassDetailsDto(o));
                })
            );
    }
}
