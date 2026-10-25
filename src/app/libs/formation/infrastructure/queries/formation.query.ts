import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { QueryCache } from 'src/app/core/query-cache/query-cache';
import { toFieldsParams } from 'src/app/core/utils/to-fields-params';
import { environment } from 'src/environments/environment';
import { FormationDetailsDto } from '../../usecase/dtos/formation-details.dto';
import { TODAYS_FORMATION_FIELDS } from '../../usecase/formation-fields';
import { FormationDtoBuilder } from '../builders/formation.dto.builder';
import { FormationModel } from '../models/formation.model';

@Injectable({ providedIn: 'root' })
export class FormationQuery {
    readonly #http = inject(HttpClient);

    readonly #v3ApiUrl = environment.apiUrl + '/v3/formations';
    readonly #cache = new QueryCache();

    // 号車・車両は使わないので結合しない。時刻印も読まない（API の include・fields）。
    findManyBySpecificDate(params: {
        date: string;
        forceReload?: boolean;
    }): Observable<FormationDetailsDto[]> {
        const { date, forceReload } = params;

        return this.#cache
            .get({
                name: 'findManyBySpecificDate',
                params: { date },
                fetch: () =>
                    this.#http.get<FormationModel[]>(
                        `${this.#v3ApiUrl}/as/of/${date}`,
                        {
                            params: new HttpParams({
                                fromObject: {
                                    include: '',
                                    ...toFieldsParams(TODAYS_FORMATION_FIELDS),
                                },
                            }),
                            observe: 'response',
                        },
                    ),
                forceReload,
            })
            .pipe(map((res) => FormationDtoBuilder.buildFromModels(res.body)));
    }

    findManyBySpecificPeriod(params: {
        startDate: string;
        endDate: string;
        forceReload?: boolean;
    }): Observable<FormationDetailsDto[]> {
        const { startDate, endDate, forceReload } = params;

        return this.#cache
            .get({
                name: 'findManyBySpecificPeriod',
                params: { startDate, endDate },
                fetch: () =>
                    this.#http.get<FormationModel[]>(
                        `${this.#v3ApiUrl}/from/${startDate}/to/${endDate}`,
                        { observe: 'response' },
                    ),
                forceReload,
            })
            .pipe(map((res) => FormationDtoBuilder.buildFromModels(res.body)));
    }
}
