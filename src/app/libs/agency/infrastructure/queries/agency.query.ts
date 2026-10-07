import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { QueryCache } from 'src/app/core/query-cache/query-cache';
import { environment } from 'src/environments/environment';
import { AgencyDetailsDto } from '../../usecase/dtos/agency-details.dto';
import { AgencyDtoBuilder } from '../builders/agency.dto.builder';
import { AgencyModel } from '../models/agency.model';

@Injectable({ providedIn: 'root' })
export class AgencyQuery {
    private readonly http = inject(HttpClient);

    readonly #v3ApiUrl = environment.apiUrl + '/v3/agencies';
    readonly #cache = new QueryCache();

    findMany(params?: {
        forceReload?: boolean;
    }): Observable<AgencyDetailsDto[]> {
        const { forceReload } = params ?? {};

        return this.#cache
            .get({
                name: 'findMany',
                params: {},
                fetch: () =>
                    this.http.get<AgencyModel[]>(this.#v3ApiUrl, {
                        observe: 'response',
                    }),
                forceReload,
            })
            .pipe(
                map((res) =>
                    res.body.map((o) => AgencyDtoBuilder.buildFromModel(o)),
                ),
            );
    }
}
