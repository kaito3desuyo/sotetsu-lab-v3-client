import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { QueryCache } from 'src/app/core/query-cache/query-cache';
import { environment } from 'src/environments/environment';
import { FormationDetailsDto } from '../../usecase/dtos/formation-details.dto';
import { FormationsDtoBuilder } from '../builders/formation.dto.builder';
import { FormationModel } from '../models/formation.model';

@Injectable({ providedIn: 'root' })
export class FormationQuery {
    readonly #v3ApiUrl = environment.apiUrl + '/v3/formations';
    readonly #cache = new QueryCache();

    constructor(private readonly http: HttpClient) {}

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
                    this.http.get<FormationModel[]>(
                        `${this.#v3ApiUrl}/as/of/${date}`,
                        { observe: 'response' },
                    ),
                forceReload,
            })
            .pipe(map((res) => FormationsDtoBuilder.buildFromModels(res.body)));
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
                    this.http.get<FormationModel[]>(
                        `${this.#v3ApiUrl}/from/${startDate}/to/${endDate}`,
                        { observe: 'response' },
                    ),
                forceReload,
            })
            .pipe(map((res) => FormationsDtoBuilder.buildFromModels(res.body)));
    }
}
