import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { md5 } from 'js-md5';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AgencyDetailsDto } from '../../usecase/dtos/agency-details.dto';
import { buildAgencyDetailsDto } from '../builders/agency-dto.builder';
import { AgencyModel } from '../models/agency.model';

@Injectable({ providedIn: 'root' })
export class AgencyQuery {
    readonly #v3ApiUrl = environment.apiUrl + '/v3/agencies';
    #obs: Record<string, Observable<any>> = {};

    constructor(private readonly http: HttpClient) {}

    findMany_V3(params?: {
        forceReload?: boolean;
    }): Observable<AgencyDetailsDto[]> {
        const { forceReload } = params ?? {};
        const key = md5(JSON.stringify({ name: 'findMany' }));

        if (forceReload) {
            this.#obs[key] = undefined;
        }

        if (!this.#obs[key]) {
            this.#obs[key] = this.http
                .get<AgencyModel[]>(this.#v3ApiUrl, { observe: 'response' })
                .pipe(
                    shareReplay({ bufferSize: 1, refCount: true }),
                    map((res) => res.body.map((o) => buildAgencyDetailsDto(o))),
                );
        }

        return this.#obs[key];
    }
}
