import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { md5 } from 'js-md5';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { FormationDetailsDto } from '../../usecase/dtos/formation-details.dto';
import { FormationsDtoBuilder } from '../builders/formation-dto.builder';
import { FormationModel } from '../models/formation.model';

@Injectable({ providedIn: 'root' })
export class FormationQuery {
    readonly #v3ApiUrl = environment.apiUrl + '/v3/formations';
    #obs: Record<string, Observable<any>> = {};

    constructor(private readonly http: HttpClient) {}

    findManyBySpecificDate_V3(params: {
        date: string;
        forceReload?: boolean;
    }): Observable<FormationDetailsDto[]> {
        const { date, forceReload } = params;

        const key = md5(
            JSON.stringify({
                name: 'findManyBySpecificDate',
                date,
            }),
        );

        if (forceReload) {
            this.#obs[key] = undefined;
        }

        if (!this.#obs[key]) {
            this.#obs[key] = this.http
                .get<FormationModel[]>(
                    `${this.#v3ApiUrl}/as/of/${date}`,
                    {
                        observe: 'response',
                    },
                )
                .pipe(
                    shareReplay({
                        bufferSize: 1,
                        refCount: true,
                    }),
                    map((res) => {
                        return FormationsDtoBuilder.toDetailsDto(res.body);
                    }),
                );
        }

        return this.#obs[key];
    }

    findManyBySpecificPeriod_V3(params: {
        startDate: string;
        endDate: string;
        forceReload?: boolean;
    }): Observable<FormationDetailsDto[]> {
        const { startDate, endDate, forceReload } = params;

        const key = md5(
            JSON.stringify({
                name: 'findManyBySpecificPeriod',
                startDate,
                endDate,
            }),
        );

        if (forceReload) {
            this.#obs[key] = undefined;
        }

        if (!this.#obs[key]) {
            this.#obs[key] = this.http
                .get<FormationModel[]>(
                    `${this.#v3ApiUrl}/from/${startDate}/to/${endDate}`,
                    {
                        observe: 'response',
                    },
                )
                .pipe(
                    shareReplay({
                        bufferSize: 1,
                        refCount: true,
                    }),
                    map((res) => {
                        return FormationsDtoBuilder.toDetailsDto(res.body);
                    }),
                );
        }

        return this.#obs[key];
    }
}
