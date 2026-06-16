import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { md5 } from 'js-md5';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { StationDetailsDto } from '../../usecase/dtos/station-details.dto';
import { StationDtoBuilder } from '../builders/station.dto.builder';
import { StationModel } from '../models/station.model';

@Injectable({ providedIn: 'root' })
export class StationQuery {
    readonly #v3ApiUrl = environment.apiUrl + '/v3/stations';
    #obs: Record<string, Observable<any>> = {};

    constructor(private readonly http: HttpClient) {}

    findMany(params?: {
        forceReload?: boolean;
    }): Observable<StationDetailsDto[]> {
        const { forceReload } = params ?? {};
        const key = md5(JSON.stringify({ name: 'findMany' }));

        if (forceReload) {
            this.#obs[key] = undefined;
        }

        if (!this.#obs[key]) {
            this.#obs[key] = this.http
                .get<StationModel[]>(this.#v3ApiUrl, { observe: 'response' })
                .pipe(
                    shareReplay({ bufferSize: 1, refCount: true }),
                    map((res) =>
                        res.body.map((o) => StationDtoBuilder.buildFromModel(o)),
                    ),
                );
        }

        return this.#obs[key];
    }
}
