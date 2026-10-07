import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { omitBy } from 'es-toolkit';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { QueryCache } from 'src/app/core/query-cache/query-cache';
import { QueryInvalidator } from 'src/app/core/query-cache/query-invalidator';
import { environment } from 'src/environments/environment';
import { OperationSightingDetailsDto } from '../../usecase/dtos/operation-sighting-details.dto';
import { OperationSightingTimeCrossSectionDto } from '../../usecase/dtos/operation-sighting-time-cross-section.dto';
import {
    OperationSightingDtoBuilder,
    OperationSightingsDtoBuilder,
} from '../builders/operation-sighting.dto.builder';
import { OperationSightingTimeCrossSectionDtoBuilder } from '../builders/operation-sighting-time-cross-section.dto.builder';
import { OperationSightingTimeCrossSectionModel } from '../models/operation-sighting-time-cross-section.model';
import { OperationSightingModel } from '../models/operation-sighting.model';

@Injectable({ providedIn: 'root' })
export class OperationSightingQuery {
    private readonly http = inject(HttpClient);

    readonly #v3ApiUrl = environment.apiUrl + '/v3/operation-sightings';
    readonly #cache = new QueryCache();
    readonly #invalidator = inject(QueryInvalidator);

    constructor() {
        this.#invalidator.invalidated$
            .pipe(
                filter((tag) => tag === 'sighting'),
                takeUntilDestroyed(),
            )
            .subscribe(() => this.#cache.clear());
    }

    findManyBySpecificPeriod(params: {
        from: string;
        to: string;
        includeInvalidated?: boolean;
        forceReload?: boolean;
    }): Observable<OperationSightingDetailsDto[]> {
        const { from, to, includeInvalidated, forceReload } = params;

        return this.#cache
            .get({
                name: 'findManyBySpecificPeriod',
                params: { from, to, includeInvalidated },
                fetch: () =>
                    this.http.get<OperationSightingModel[]>(
                        `${this.#v3ApiUrl}/from/${from}/to/${to}`,
                        {
                            params: omitBy(
                                { includeInvalidated },
                                (v) => v === undefined,
                            ),
                            observe: 'response',
                            cache: this.#invalidator.requestCache('sighting'),
                        },
                    ),
                forceReload,
            })
            .pipe(
                map((res) =>
                    OperationSightingsDtoBuilder.buildFromModels(res.body),
                ),
            );
    }

    /**
     * 複数の運用番号の時刻断面を 1 回で取る（番号ごとの findOneTimeCrossSectionByOperationNumber を束ねたもの）。
     * キーは運用番号。休車の 100 は返らない。
     */
    findManyTimeCrossSectionsByOperationNumbers(params: {
        operationNumbers: string[];
        forceReload?: boolean;
    }): Observable<Record<string, OperationSightingTimeCrossSectionDto>> {
        return this.#findManyTimeCrossSections(
            'operation-numbers',
            'operationNumbers',
            params.operationNumbers,
            params.forceReload,
        );
    }

    /** 複数の編成番号の時刻断面を 1 回で取る。キーは編成番号。 */
    findManyTimeCrossSectionsByFormationNumbers(params: {
        formationNumbers: string[];
        forceReload?: boolean;
    }): Observable<Record<string, OperationSightingTimeCrossSectionDto>> {
        return this.#findManyTimeCrossSections(
            'formation-numbers',
            'formationNumbers',
            params.formationNumbers,
            params.forceReload,
        );
    }

    #findManyTimeCrossSections(
        path: 'operation-numbers' | 'formation-numbers',
        paramName: 'operationNumbers' | 'formationNumbers',
        numbers: string[],
        forceReload?: boolean,
    ): Observable<Record<string, OperationSightingTimeCrossSectionDto>> {
        return this.#cache
            .get({
                name: `findManyTimeCrossSections:${path}`,
                params: { numbers },
                fetch: () =>
                    this.http.get<
                        Record<string, OperationSightingTimeCrossSectionModel>
                    >(`${this.#v3ApiUrl}/time-cross-section/${path}`, {
                        params: { [paramName]: numbers.join(',') },
                        observe: 'response',
                        cache: this.#invalidator.requestCache('sighting'),
                    }),
                forceReload,
            })
            .pipe(
                map((res) =>
                    Object.fromEntries(
                        Object.entries(res.body ?? {}).map(([n, model]) => [
                            n,
                            OperationSightingTimeCrossSectionDtoBuilder.buildFromModel(
                                model,
                            ),
                        ]),
                    ),
                ),
            );
    }

    findOneTimeCrossSectionByOperationNumber(params: {
        operationNumber: string;
        forceReload?: boolean;
    }): Observable<OperationSightingTimeCrossSectionDto> {
        const { operationNumber, forceReload } = params;

        return this.#cache
            .get({
                name: 'findOneTimeCrossSectionByOperationNumber',
                params: { operationNumber },
                fetch: () =>
                    this.http.get<OperationSightingTimeCrossSectionModel>(
                        `${this.#v3ApiUrl}/time-cross-section/operation-number/${operationNumber}`,
                        {
                            observe: 'response',
                            cache: this.#invalidator.requestCache('sighting'),
                        },
                    ),
                forceReload,
            })
            .pipe(
                map((res) =>
                    OperationSightingTimeCrossSectionDtoBuilder.buildFromModel(
                        res.body,
                    ),
                ),
            );
    }

    findOneTimeCrossSectionByFormationNumber(params: {
        formationNumber: string;
        forceReload?: boolean;
    }): Observable<OperationSightingTimeCrossSectionDto> {
        const { formationNumber, forceReload } = params;

        return this.#cache
            .get({
                name: 'findOneTimeCrossSectionByFormationNumber',
                params: { formationNumber },
                fetch: () =>
                    this.http.get<OperationSightingTimeCrossSectionModel>(
                        `${this.#v3ApiUrl}/time-cross-section/formation-number/${formationNumber}`,
                        {
                            observe: 'response',
                            cache: this.#invalidator.requestCache('sighting'),
                        },
                    ),
                forceReload,
            })
            .pipe(
                map((res) =>
                    OperationSightingTimeCrossSectionDtoBuilder.buildFromModel(
                        res.body,
                    ),
                ),
            );
    }
}
