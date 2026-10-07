import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { omitBy } from 'es-toolkit';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { QueryCache } from 'src/app/core/query-cache/query-cache';
import { QueryInvalidator } from 'src/app/core/query-cache/query-invalidator';
import { TripOperationListDtoBuilder } from 'src/app/libs/trip/infrastructure/builders/trip-operation-list.dto.builder';
import { environment } from 'src/environments/environment';
import { OperationCurrentPositionDto } from '../../usecase/dtos/operation-current-position.dto';
import { OperationDetailsDto } from '../../usecase/dtos/operation-details.dto';
import { OperationGroupDto } from '../../usecase/dtos/operation-group.dto';
import { OperationTripsDto } from '../../usecase/dtos/operation-trips.dto';
import {
    OperationDtoBuilder,
    OperationsDtoBuilder,
} from '../builders/operation.dto.builder';
import { OperationCurrentPositionDtoBuilder } from '../builders/operation-current-position.dto.builder';
import { OperationGroupsDtoBuilder } from '../builders/operation-group.dto.builder';
import { OperationCurrentPositionModel } from '../models/operation-current-position.model';
import { OperationGroupModel } from '../models/operation-group.model';
import { OperationTripsModel } from '../models/operation-trips.model';
import { OperationModel } from '../models/operation.model';

/** 列車情報が書かれたら捨てる取得（時刻表系。cache: 'reload' の対象） */
const TIMETABLE_METHODS = [
    'findManyByCalendarId',
    'findManyWithTrips',
    'findOneWithTrips',
    'findManyBySpecificPeriod',
] as const;

/** 目撃が書かれたら捨てる取得（cache は目撃の窓で決める） */
const SIGHTING_METHODS = [
    'findOneWithCurrentPosition',
    'findManyWithCurrentPosition',
] as const;

@Injectable({ providedIn: 'root' })
export class OperationQuery {
    readonly #v3ApiUrl = environment.apiUrl + '/v3/operations';
    readonly #cache = new QueryCache();
    readonly #invalidator = inject(QueryInvalidator);

    constructor(private readonly http: HttpClient) {
        this.#invalidator.invalidated$
            .pipe(takeUntilDestroyed())
            .subscribe((tag) =>
                this.#cache.clear(
                    tag === 'timetable' ? TIMETABLE_METHODS : SIGHTING_METHODS,
                ),
            );
    }

    findManyByCalendarId(params: {
        calendarId: string;
        forceReload?: boolean;
    }): Observable<OperationDetailsDto[]> {
        const { calendarId, forceReload } = params;

        // calendarId 未指定では /v3/operations/calendar/null を叩かず空配列を返す。
        if (!calendarId) {
            return of([]);
        }

        return this.#cache
            .get({
                name: 'findManyByCalendarId',
                params: { calendarId },
                fetch: () =>
                    this.http.get<OperationModel[]>(
                        `${this.#v3ApiUrl}/calendar/${calendarId}`,
                        {
                            observe: 'response',
                            cache: this.#invalidator.requestCache('timetable'),
                        },
                    ),
                forceReload,
            })
            .pipe(map((res) => OperationsDtoBuilder.buildFromModels(res.body)));
    }

    findManyBySpecificPeriod(params: {
        from: string;
        to: string;
        forceReload?: boolean;
    }): Observable<OperationDetailsDto[]> {
        const { from, to, forceReload } = params;

        return this.#cache
            .get({
                name: 'findManyBySpecificPeriod',
                params: { from, to },
                fetch: () =>
                    this.http.get<OperationModel[]>(
                        `${this.#v3ApiUrl}/from/${from}/to/${to}`,
                        {
                            observe: 'response',
                            cache: this.#invalidator.requestCache('timetable'),
                        },
                    ),
                forceReload,
            })
            .pipe(map((res) => OperationsDtoBuilder.buildFromModels(res.body)));
    }

    findOneWithCurrentPosition(params: {
        operationId: string;
        searchTime?: string;
        forceReload?: boolean;
    }): Observable<OperationCurrentPositionDto> {
        const { operationId, searchTime, forceReload } = params;

        return this.#cache
            .get({
                name: 'findOneWithCurrentPosition',
                params: { operationId, searchTime },
                fetch: () => {
                    const httpParams = new HttpParams({
                        fromObject: omitBy(
                            { searchTime },
                            (v) => v === undefined,
                        ),
                    });
                    return this.http.get<OperationCurrentPositionModel>(
                        `${this.#v3ApiUrl}/${operationId}/current-position`,
                        {
                            params: httpParams,
                            observe: 'response',
                            cache: this.#invalidator.requestCache('sighting'),
                        },
                    );
                },
                forceReload,
            })
            .pipe(
                map((res) =>
                    OperationCurrentPositionDtoBuilder.buildFromModel(res.body),
                ),
            );
    }

    /** 複数の運用の現在位置を 1 回で取る（運用ごとの findOneWithCurrentPosition を束ねたもの）。 */
    findManyWithCurrentPosition(params: {
        operationIds: string[];
        forceReload?: boolean;
    }): Observable<OperationCurrentPositionDto[]> {
        const { operationIds, forceReload } = params;

        return this.#cache
            .get({
                name: 'findManyWithCurrentPosition',
                params: { operationIds },
                fetch: () =>
                    this.http.get<OperationCurrentPositionModel[]>(
                        `${this.#v3ApiUrl}/current-positions`,
                        {
                            params: { operationIds: operationIds.join(',') },
                            observe: 'response',
                            cache: this.#invalidator.requestCache('sighting'),
                        },
                    ),
                forceReload,
            })
            .pipe(
                map((res) =>
                    (res.body ?? []).map((model) =>
                        OperationCurrentPositionDtoBuilder.buildFromModel(
                            model,
                        ),
                    ),
                ),
            );
    }

    /** ダイヤ内の全運用を列車つきで 1 回で取る（運用ごとの findOneWithTrips を束ねたもの）。 */
    findManyWithTrips(params: {
        calendarId: string;
        forceReload?: boolean;
    }): Observable<OperationTripsDto[]> {
        const { calendarId, forceReload } = params;

        return this.#cache
            .get({
                name: 'findManyWithTrips',
                params: { calendarId },
                fetch: () =>
                    this.http.get<OperationTripsModel[]>(
                        `${this.#v3ApiUrl}/calendar/${calendarId}/trips`,
                        {
                            observe: 'response',
                            cache: this.#invalidator.requestCache('timetable'),
                        },
                    ),
                forceReload,
            })
            .pipe(
                map((res) =>
                    res.body.map((operationTrips) => ({
                        operation: OperationDtoBuilder.buildFromModel(
                            operationTrips.operation,
                        ),
                        trips: operationTrips.trips.map((o) =>
                            TripOperationListDtoBuilder.buildFromModel(o),
                        ),
                    })),
                ),
            );
    }

    findOneWithTrips(params: {
        operationId: string;
        forceReload?: boolean;
    }): Observable<OperationTripsDto> {
        const { operationId, forceReload } = params;

        return this.#cache
            .get({
                name: 'findOneWithTrips',
                params: { operationId },
                fetch: () =>
                    this.http.get<OperationTripsModel>(
                        `${this.#v3ApiUrl}/${operationId}/trips`,
                        {
                            observe: 'response',
                            cache: this.#invalidator.requestCache('timetable'),
                        },
                    ),
                forceReload,
            })
            .pipe(
                map((res) => ({
                    operation: OperationDtoBuilder.buildFromModel(
                        res.body.operation,
                    ),
                    trips: res.body.trips.map((o) =>
                        TripOperationListDtoBuilder.buildFromModel(o),
                    ),
                })),
            );
    }

    findManyGroups(params?: {
        forceReload?: boolean;
    }): Observable<OperationGroupDto[]> {
        const { forceReload } = params ?? {};

        return this.#cache
            .get({
                name: 'findManyGroups',
                params: {},
                fetch: () =>
                    this.http.get<OperationGroupModel[]>(
                        `${this.#v3ApiUrl}/groups`,
                        { observe: 'response' },
                    ),
                forceReload,
            })
            .pipe(
                map((res) =>
                    OperationGroupsDtoBuilder.buildFromModels(res.body),
                ),
            );
    }
}
