import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { omitBy } from 'es-toolkit';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { QueryCache } from 'src/app/core/query-cache/query-cache';
import { QueryInvalidator } from 'src/app/core/query-cache/query-invalidator';
import { toFieldsParams } from 'src/app/core/utils/to-fields-params';
import { environment } from 'src/environments/environment';
import { MyOperationSightingDto } from '../../usecase/dtos/my-operation-sighting.dto';
import { OperationSightingAuthorDto } from '../../usecase/dtos/operation-sighting-author.dto';
import { OperationSightingListParamsDto } from '../../usecase/dtos/operation-sighting-list-params.dto';
import { OperationSightingRecentDto } from '../../usecase/dtos/operation-sighting-recent.dto';
import { OperationSightingSummaryDto } from '../../usecase/dtos/operation-sighting-summary.dto';
import { TIME_CROSS_SECTION_FIELDS } from '../../usecase/operation-sighting-time-cross-section-fields';
import { OperationSightingDetailsDto } from '../../usecase/dtos/operation-sighting-details.dto';
import { OperationSightingTimeCrossSectionDto } from '../../usecase/dtos/operation-sighting-time-cross-section.dto';
import { OperationSightingDtoBuilder } from '../builders/operation-sighting.dto.builder';
import { OperationSightingTimeCrossSectionDtoBuilder } from '../builders/operation-sighting-time-cross-section.dto.builder';
import { MyOperationSightingModel } from '../models/my-operation-sighting.model';
import {
    OperationSightingRecentModel,
    OperationSightingSummaryModel,
} from '../models/operation-sighting-summary.model';
import { OperationSightingTimeCrossSectionModel } from '../models/operation-sighting-time-cross-section.model';
import { OperationSightingModel } from '../models/operation-sighting.model';

@Injectable({ providedIn: 'root' })
export class OperationSightingQuery {
    readonly #http = inject(HttpClient);

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
        includeCarriedOver?: boolean;
        forceReload?: boolean;
    }): Observable<OperationSightingDetailsDto[]> {
        const {
            from,
            to,
            includeInvalidated,
            includeCarriedOver,
            forceReload,
        } = params;

        return this.#cache
            .get({
                name: 'findManyBySpecificPeriod',
                params: { from, to, includeInvalidated, includeCarriedOver },
                fetch: () =>
                    this.#http.get<OperationSightingModel[]>(
                        `${this.#v3ApiUrl}/from/${from}/to/${to}`,
                        {
                            params: omitBy(
                                { includeInvalidated, includeCarriedOver },
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
                    OperationSightingDtoBuilder.buildFromModels(res.body),
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

    /** 中の運用・編成の時刻印は読まないので返させない（API の fields）。 */
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
                    this.#http.get<
                        Record<string, OperationSightingTimeCrossSectionModel>
                    >(`${this.#v3ApiUrl}/time-cross-section/${path}`, {
                        params: new HttpParams({
                            fromObject: {
                                [paramName]: numbers.join(','),
                                ...toFieldsParams(TIME_CROSS_SECTION_FIELDS),
                            },
                        }),
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
                    this.#http.get<OperationSightingTimeCrossSectionModel>(
                        `${this.#v3ApiUrl}/time-cross-section/operation-number/${operationNumber}`,
                        {
                            observe: 'response',
                            cache: this.#invalidator.requestCache('sighting'),
                        },
                    ),
                forceReload,
            })
            .pipe(
                map(
                    (res) =>
                        res.body &&
                        OperationSightingTimeCrossSectionDtoBuilder.buildFromModel(
                            res.body,
                        ),
                ),
            );
    }

    findOneTimeCrossSectionByFormationNumber(params: {
        formationNumber: string;
        searchTime?: string;
        forceReload?: boolean;
    }): Observable<OperationSightingTimeCrossSectionDto> {
        const { formationNumber, searchTime, forceReload } = params;

        return this.#cache
            .get({
                name: 'findOneTimeCrossSectionByFormationNumber',
                params: { formationNumber, searchTime },
                fetch: () =>
                    this.#http.get<OperationSightingTimeCrossSectionModel>(
                        `${this.#v3ApiUrl}/time-cross-section/formation-number/${formationNumber}`,
                        {
                            params: new HttpParams({
                                fromObject: omitBy(
                                    { searchTime },
                                    (v) => v === undefined,
                                ),
                            }),
                            observe: 'response',
                            cache: this.#invalidator.requestCache('sighting'),
                        },
                    ),
                forceReload,
            })
            .pipe(
                map(
                    (res) =>
                        res.body &&
                        OperationSightingTimeCrossSectionDtoBuilder.buildFromModel(
                            res.body,
                        ),
                ),
            );
    }

    /** 投稿者ごとの目撃。QueryCache を通さず、呼ぶたびに取る */
    findManyByUserId(
        userId: string,
        params: OperationSightingListParamsDto = {},
    ): Observable<OperationSightingSummaryDto[]> {
        return this.#http
            .get<OperationSightingSummaryModel[]>(
                `${environment.apiUrl}/v3/users/${encodeURIComponent(userId)}/operation-sightings`,
                { params: this.#listParams(params) },
            )
            .pipe(
                map((models) =>
                    OperationSightingDtoBuilder.buildSummariesFromModels(
                        models,
                    ),
                ),
            );
    }

    /** 本人の目撃（裏付けつき）。QueryCache を通さず、呼ぶたびに取る */
    findManyMine(
        params: OperationSightingListParamsDto = {},
    ): Observable<MyOperationSightingDto[]> {
        return this.#http
            .get<MyOperationSightingModel[]>(
                `${environment.apiUrl}/v3/users/me/operation-sightings`,
                { params: this.#listParams(params) },
            )
            .pipe(
                map((models) =>
                    OperationSightingDtoBuilder.buildMineFromModels(models),
                ),
            );
    }

    /** 新着の目撃（投稿者つき）。QueryCache を通さず、呼ぶたびに取る */
    findManyRecent(
        params: OperationSightingListParamsDto = {},
    ): Observable<OperationSightingRecentDto[]> {
        return this.#http
            .get<OperationSightingRecentModel[]>(`${this.#v3ApiUrl}/recent`, {
                params: this.#listParams(params),
            })
            .pipe(
                map((models) =>
                    OperationSightingDtoBuilder.buildRecentsFromModels(models),
                ),
            );
    }

    /** 投稿者。QueryCache を通さず、呼ぶたびに取る */
    findAuthor(
        operationSightingId: string,
    ): Observable<OperationSightingAuthorDto> {
        return this.#http
            .get<{
                userId: string | null;
            }>(
                `${this.#v3ApiUrl}/${encodeURIComponent(operationSightingId)}/author`,
            )
            .pipe(map(({ userId }) => ({ userId })));
    }

    #listParams({ limit, before }: OperationSightingListParamsDto): HttpParams {
        let params = new HttpParams();
        if (limit !== undefined) {
            params = params.set('limit', limit);
        }
        if (before !== undefined) {
            params = params.set('before', before);
        }
        return params;
    }
}
