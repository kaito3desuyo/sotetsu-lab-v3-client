import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Pagination } from 'src/app/core/utils/pagination';
import { environment } from 'src/environments/environment';
import { FormationDetailsDto } from '../../usecase/dtos/formation-details.dto';
import { buildFormationDetailsDto } from '../builders/formation-dto.builder';
import { FormationModel } from '../models/formation.model';

@Injectable({ providedIn: 'root' })
export class FormationQuery {
    private readonly apiUrl = environment.apiUrl + '/v2/formations';

    constructor(private readonly http: HttpClient) {}

    findManyBySpeficicDate(
        qb: RequestQueryBuilder,
        params: { date: string }
    ): Observable<Pagination<FormationDetailsDto> | FormationDetailsDto[]> {
        const httpParams = new HttpParams({ fromString: qb.query() });

        return this.http
            .get<FormationModel[]>(this.apiUrl + '/as/of/' + params.date, {
                params: httpParams,
                observe: 'response',
            })
            .pipe(
                map((res) => {
                    return Pagination.isApiPaginated(res)
                        ? Pagination.create(
                              res.body.map((o) => buildFormationDetailsDto(o)),
                              Pagination.getApiPageSettings(res)
                          )
                        : res.body.map((o) => buildFormationDetailsDto(o));
                })
            );
    }

    findManyBySpecificPeriod(
        qb: RequestQueryBuilder,
        params: { startDate: string; endDate: string }
    ): Observable<Pagination<FormationDetailsDto> | FormationDetailsDto[]> {
        const httpParams = new HttpParams({ fromString: qb.query() });

        return this.http
            .get<FormationModel[]>(
                this.apiUrl +
                    '/from/' +
                    params.startDate +
                    '/to/' +
                    params.endDate,
                {
                    params: httpParams,
                    observe: 'response',
                }
            )
            .pipe(
                map((res) => {
                    return Pagination.isApiPaginated(res)
                        ? Pagination.create(
                              res.body.map((o) => buildFormationDetailsDto(o)),
                              Pagination.getApiPageSettings(res)
                          )
                        : res.body.map((o) => buildFormationDetailsDto(o));
                })
            );
    }
}
