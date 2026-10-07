import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { QueryCache } from 'src/app/core/query-cache/query-cache';
import { environment } from 'src/environments/environment';
import { TripClassDetailsDto } from '../../usecase/dtos/trip-class-details.dto';
import { TripClassesDtoBuilder } from '../builders/trip-class.dto.builder';
import { TripClassModel } from '../models/trip-class.model';

@Injectable({ providedIn: 'root' })
export class TripClassQuery {
    readonly #v3ApiUrl = environment.apiUrl + '/v3/trip-classes';
    readonly #cache = new QueryCache();

    constructor(private readonly http: HttpClient) {}

    findMany(params: {
        forceReload?: boolean;
    }): Observable<TripClassDetailsDto[]> {
        const { forceReload } = params;

        return this.#cache
            .get({
                name: 'findMany',
                params: {},
                fetch: () =>
                    this.http.get<TripClassModel[]>(this.#v3ApiUrl, {
                        observe: 'response',
                    }),
                forceReload,
            })
            .pipe(
                map((res) => TripClassesDtoBuilder.buildFromModels(res.body)),
            );
    }
}
