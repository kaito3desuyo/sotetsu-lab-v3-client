import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { md5 } from 'js-md5';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { TripClassDetailsDto } from '../../usecase/dtos/trip-class-details.dto';
import { TripClassesDtoBuilder } from '../builders/trip-class.dto.builder';
import { TripClassModel } from '../models/trip-class.model';

@Injectable({ providedIn: 'root' })
export class TripClassQuery {
    readonly #v3ApiUrl = environment.apiUrl + '/v3/trip-classes';
    #obs: Record<string, Observable<any>> = {};

    constructor(private readonly http: HttpClient) {}

    findMany(params: {
        forceReload?: boolean;
    }): Observable<TripClassDetailsDto[]> {
        const { forceReload } = params;

        const key = md5(
            JSON.stringify({
                name: 'findMany',
            }),
        );

        if (forceReload) {
            this.#obs[key] = undefined;
        }

        if (!this.#obs[key]) {
            this.#obs[key] = this.http
                .get<TripClassModel[]>(this.#v3ApiUrl, { observe: 'response' })
                .pipe(
                    shareReplay({ bufferSize: 1, refCount: true }),
                    map((res) => TripClassesDtoBuilder.buildFromModels(res.body)),
                );
        }

        return this.#obs[key];
    }
}
