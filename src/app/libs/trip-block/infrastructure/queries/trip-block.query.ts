import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, forkJoin } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { QueryInvalidator } from 'src/app/core/query-cache/query-invalidator';
import { QueryCache } from 'src/app/core/query-cache/query-cache';
import { environment } from 'src/environments/environment';
import { TripBlockDetailsDto } from '../../usecase/dtos/trip-block-details.dto';
import { TripBlockFields } from '../../usecase/trip-block-fields';
import { TripBlockDtoBuilder } from '../builders/trip-block.dto.builder';
import { TripBlockModel } from '../models/trip-block.model';

@Injectable({ providedIn: 'root' })
export class TripBlockQuery {
    private readonly http = inject(HttpClient);

    readonly #v3ApiUrl = environment.apiUrl + '/v3/trip-blocks';
    readonly #cache = new QueryCache();
    readonly #invalidator = inject(QueryInvalidator);

    constructor() {
        // 列車情報が書かれたら全部捨てる（どのダイヤ・どの列車が変わったかは追わない）
        this.#invalidator.invalidated$
            .pipe(
                filter((tag) => tag === 'timetable'),
                takeUntilDestroyed(),
            )
            .subscribe(() => this.#cache.clear());
    }

    findManyByFilter(params: {
        calendarId: string;
        tripDirection: number;
        fields?: TripBlockFields;
        forceReload?: boolean;
    }): Observable<TripBlockDetailsDto[]> {
        const { calendarId, tripDirection, fields, forceReload } = params;

        return this.#cache
            .get({
                name: 'findManyByFilter',
                params: { calendarId, tripDirection, fields },
                fetch: () => {
                    const httpParams = new HttpParams({
                        fromObject: {
                            calendarId,
                            tripDirection: String(tripDirection),
                            ...Object.fromEntries(
                                Object.entries(fields ?? {}).map(
                                    ([resource, names]) => [
                                        `fields[${resource}]`,
                                        names.join(','),
                                    ],
                                ),
                            ),
                        },
                    });
                    return this.http.get<TripBlockModel[]>(this.#v3ApiUrl, {
                        params: httpParams,
                        observe: 'response',
                        cache: this.#invalidator.requestCache('timetable'),
                    });
                },
                forceReload,
            })
            .pipe(
                map((res) =>
                    res.body.map((o) => TripBlockDtoBuilder.buildFromModel(o)),
                ),
            );
    }

    /**
     * 指定 calendarId の上下（tripDirection=0/1）バルクデータをまとめて取得する。
     * N1(ダイヤグラム)/N2(列車位置情報)/N3(ダッシュボード) が同じキーで呼べば
     * ページ遷移をまたいでも再取得しない（findManyByFilter のキャッシュに加え、
     * forkJoin した結果自体もキャッシュする）。
     */
    findManyByCalendarId(params: {
        calendarId: string;
        fields?: TripBlockFields;
        forceReload?: boolean;
    }): Observable<Record<number, TripBlockDetailsDto[]>> {
        const { calendarId, fields, forceReload } = params;

        return this.#cache.get({
            name: 'findManyByCalendarId',
            params: { calendarId, fields },
            fetch: () =>
                forkJoin({
                    0: this.findManyByFilter({
                        calendarId,
                        tripDirection: 0,
                        fields,
                        forceReload,
                    }),
                    1: this.findManyByFilter({
                        calendarId,
                        tripDirection: 1,
                        fields,
                        forceReload,
                    }),
                }),
            forceReload,
        });
    }

    findOneById(params: {
        id: string;
        forceReload?: boolean;
    }): Observable<TripBlockDetailsDto> {
        const { id, forceReload } = params;

        return this.#cache
            .get({
                name: 'findOneById',
                params: { id },
                fetch: () =>
                    this.http.get<TripBlockModel>(`${this.#v3ApiUrl}/${id}`, {
                        observe: 'response',
                        cache: this.#invalidator.requestCache('timetable'),
                    }),
                forceReload,
            })
            .pipe(map((res) => TripBlockDtoBuilder.buildFromModel(res.body)));
    }
}
