import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Pagination } from 'src/app/core/utils/pagination';
import { environment } from 'src/environments/environment';
import { ServiceDetailsDto } from '../../usecase/dtos/service-details.dto';
import { buildServiceDetailsDto } from '../builders/service-dto.builder';
import { ServiceModel } from '../models/service.model';

@Injectable({ providedIn: 'root' })
export class ServiceQuery {
    private readonly apiUrl = environment.apiUrl + '/v2/services';

    constructor(private readonly http: HttpClient) {}

    findMany(
        qb: RequestQueryBuilder
    ): Observable<Pagination<ServiceDetailsDto> | ServiceDetailsDto[]> {
        const httpParams = new HttpParams({ fromString: qb.query() });

        return this.http
            .get<ServiceModel[]>(this.apiUrl, {
                params: httpParams,
                observe: 'response',
            })
            .pipe(
                map((res) => {
                    return Pagination.isApiPaginated(res)
                        ? Pagination.create(
                              res.body.map((o) => buildServiceDetailsDto(o)),
                              Pagination.getApiPageSettings(res)
                          )
                        : res.body.map((o) => buildServiceDetailsDto(o));
                })
            );
    }
}
