import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Pagination } from 'src/app/core/utils/pagination';
import { environment } from 'src/environments/environment';
import { AgencyDetailsDto } from '../../usecase/dtos/agency-details.dto';
import { buildAgencyDetailsDto } from '../builders/agency-dto.builder';
import { AgencyModel } from '../models/agency.model';

@Injectable({ providedIn: 'root' })
export class AgencyQuery {
    private readonly apiUrl = environment.apiUrl + '/v2/agencies';

    constructor(private readonly http: HttpClient) {}

    findMany(
        qb: RequestQueryBuilder,
    ): Observable<Pagination<AgencyDetailsDto> | AgencyDetailsDto[]> {
        const httpParams = new HttpParams({ fromString: qb.query() });

        return this.http
            .get<AgencyModel[]>(this.apiUrl, {
                params: httpParams,
                observe: 'response',
            })
            .pipe(
                map((res) => {
                    return Pagination.isApiPaginated(res)
                        ? Pagination.create(
                              res.body.map((o) => buildAgencyDetailsDto(o)),
                              Pagination.getApiPageSettings(res),
                          )
                        : res.body.map((o) => buildAgencyDetailsDto(o));
                }),
            );
    }
}
