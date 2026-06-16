import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { omitBy } from 'es-toolkit';
import { md5 } from 'js-md5';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { OperationSightingDetailsDto } from '../../usecase/dtos/operation-sighting-details.dto';
import { OperationSightingTimeCrossSectionDto } from '../../usecase/dtos/operation-sighting-time-cross-section.dto';
import { OperationSightingDtoBuilder } from '../builders/operation-sighting.dto.builder';
import { OperationSightingTimeCrossSectionDtoBuilder } from '../builders/operation-sighting-time-cross-section.dto.builder';
import { OperationSightingTimeCrossSectionModel } from '../models/operation-sighting-time-cross-section.model';
import { OperationSightingModel } from '../models/operation-sighting.model';

@Injectable({ providedIn: 'root' })
export class OperationSightingQuery {
    readonly #v3ApiUrl = environment.apiUrl + '/v3/operation-sightings';
    #obs: Record<string, Observable<any>> = {};

    constructor(private readonly http: HttpClient) {}

    findManyBySpecificPeriod(params: {
        from: string;
        to: string;
        includeInvalidated?: boolean;
        forceReload?: boolean;
    }): Observable<OperationSightingDetailsDto[]> {
        const { from, to, includeInvalidated, forceReload } = params;

        const key = md5(
            JSON.stringify({
                name: 'findManyBySpecificPeriod',
                from,
                to,
                includeInvalidated,
            }),
        );

        if (forceReload) {
            this.#obs[key] = undefined;
        }

        if (!this.#obs[key]) {
            this.#obs[key] = this.http
                .get<
                    OperationSightingModel[]
                >(`${this.#v3ApiUrl}/from/${from}/to/${to}`, { params: omitBy({ includeInvalidated }, (v) => v === undefined), observe: 'response' })
                .pipe(
                    shareReplay({
                        bufferSize: 1,
                        refCount: true,
                    }),
                    map((res) => {
                        return res.body;
                    }),
                );
        }

        return this.#obs[key];
    }

    findOneTimeCrossSectionByOperationNumber(params: {
        operationNumber: string;
        forceReload?: boolean;
    }): Observable<OperationSightingTimeCrossSectionDto> {
        const { operationNumber, forceReload } = params;

        const key = md5(
            JSON.stringify({
                name: 'findOneTimeCrossSectionByOperationNumber',
                operationNumber,
            }),
        );

        if (forceReload) {
            this.#obs[key] = undefined;
        }

        if (!this.#obs[key]) {
            this.#obs[key] = this.http
                .get<OperationSightingTimeCrossSectionModel>(
                    `${this.#v3ApiUrl}/time-cross-section/operation-number/${operationNumber}`,
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
                        return OperationSightingTimeCrossSectionDtoBuilder.buildFromModel(
                            res.body,
                        );
                    }),
                );
        }

        return this.#obs[key];
    }

    findOneTimeCrossSectionByFormationNumber(params: {
        formationNumber: string;
        forceReload?: boolean;
    }): Observable<OperationSightingTimeCrossSectionDto> {
        const { formationNumber, forceReload } = params;

        const key = md5(
            JSON.stringify({
                name: 'findOneTimeCrossSectionByFormationNumber',
                formationNumber,
            }),
        );

        if (forceReload) {
            this.#obs[key] = undefined;
        }

        if (!this.#obs[key]) {
            this.#obs[key] = this.http
                .get<OperationSightingTimeCrossSectionModel>(
                    `${this.#v3ApiUrl}/time-cross-section/formation-number/${formationNumber}`,
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
                        return OperationSightingTimeCrossSectionDtoBuilder.buildFromModel(
                            res.body,
                        );
                    }),
                );
        }

        return this.#obs[key];
    }
}
