import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { QueryCache } from 'src/app/core/query-cache/query-cache';
import { environment } from 'src/environments/environment';
import { StationDetailsDto } from '../../usecase/dtos/station-details.dto';
import { StationDtoBuilder } from '../builders/station.dto.builder';
import { StationModel } from '../models/station.model';

@Injectable({ providedIn: 'root' })
export class StationQuery {
    private readonly http = inject(HttpClient);

    readonly #v3ApiUrl = environment.apiUrl + '/v3/stations';
    readonly #cache = new QueryCache();

    findMany(params?: {
        forceReload?: boolean;
    }): Observable<StationDetailsDto[]> {
        const { forceReload } = params ?? {};

        return this.#cache
            .get({
                name: 'findMany',
                params: {},
                fetch: () =>
                    this.http.get<StationModel[]>(this.#v3ApiUrl, {
                        observe: 'response',
                    }),
                forceReload,
            })
            .pipe(
                map((res) =>
                    res.body.map((o) => StationDtoBuilder.buildFromModel(o)),
                ),
            );
    }
}
