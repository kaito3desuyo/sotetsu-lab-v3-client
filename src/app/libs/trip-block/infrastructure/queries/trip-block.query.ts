import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { md5 } from 'js-md5';
import { Observable, forkJoin } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { TripBlockDetailsDto } from '../../usecase/dtos/trip-block-details.dto';
import { TripBlockFields } from '../../usecase/trip-block-fields';
import { TripBlockDtoBuilder } from '../builders/trip-block.dto.builder';
import { TripBlockModel } from '../models/trip-block.model';

@Injectable({ providedIn: 'root' })
export class TripBlockQuery {
    readonly #v3ApiUrl = environment.apiUrl + '/v3/trip-blocks';
    #obs: Record<string, Observable<any>> = {};
    // ダイヤ改正等でバルクキャッシュ全体を失効させるための世代キー。
    // invalidateAll() で更新すると、以後の findManyByFilter/findManyByCalendarId は
    // 新しいキャッシュキーとなり実質的に再取得される。
    #worldVersion = 0;

    constructor(private readonly http: HttpClient) {}

    /**
     * ダイヤ改正等でバルクキャッシュ（findManyByFilter / findManyByCalendarId）を
     * まとめて失効させる。既存キャッシュを破棄しつつ、以後のキーも新しい世代になる。
     */
    invalidateAll(): void {
        this.#worldVersion += 1;
        this.#obs = {};
    }

    findManyByFilter(params: {
        calendarId: string;
        tripDirection: number;
        fields?: TripBlockFields;
        forceReload?: boolean;
    }): Observable<TripBlockDetailsDto[]> {
        const { calendarId, tripDirection, fields, forceReload } = params;

        const key = md5(
            JSON.stringify({
                name: 'findManyByFilter',
                calendarId,
                tripDirection,
                fields,
                worldVersion: this.#worldVersion,
            }),
        );

        if (forceReload) {
            this.#obs[key] = undefined;
        }

        if (!this.#obs[key]) {
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
            this.#obs[key] = this.http
                .get<TripBlockModel[]>(this.#v3ApiUrl, {
                    params: httpParams,
                    observe: 'response',
                })
                .pipe(
                    shareReplay({ bufferSize: 1, refCount: true }),
                    map((res) =>
                        res.body.map((o) => TripBlockDtoBuilder.buildFromModel(o)),
                    ),
                );
        }

        return this.#obs[key];
    }

    /**
     * 指定 calendarId の上下（tripDirection=0/1）バルクデータをまとめて取得する。
     * N1(ダイヤグラム)/N2(列車位置情報)/N3(ダッシュボード) が同じキーで呼べば
     * ページ遷移をまたいでも再取得しない（findManyByFilter の shareReplay キャッシュに加え、
     * forkJoin した結果自体もキャッシュする）。
     */
    findManyByCalendarId(params: {
        calendarId: string;
        fields?: TripBlockFields;
        forceReload?: boolean;
    }): Observable<Record<number, TripBlockDetailsDto[]>> {
        const { calendarId, fields, forceReload } = params;

        const key = md5(
            JSON.stringify({
                name: 'findManyByCalendarId',
                calendarId,
                fields,
                worldVersion: this.#worldVersion,
            }),
        );

        if (forceReload) {
            this.#obs[key] = undefined;
        }

        if (!this.#obs[key]) {
            this.#obs[key] = forkJoin({
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
            }).pipe(shareReplay({ bufferSize: 1, refCount: true }));
        }

        return this.#obs[key];
    }

    findOneById(params: {
        id: string;
        forceReload?: boolean;
    }): Observable<TripBlockDetailsDto> {
        const { id, forceReload } = params;

        const key = md5(JSON.stringify({ name: 'findOneById', id }));

        if (forceReload) {
            this.#obs[key] = undefined;
        }

        if (!this.#obs[key]) {
            this.#obs[key] = this.http
                .get<TripBlockModel>(`${this.#v3ApiUrl}/${id}`, {
                    observe: 'response',
                })
                .pipe(
                    shareReplay({ bufferSize: 1, refCount: true }),
                    map((res) => TripBlockDtoBuilder.buildFromModel(res.body)),
                );
        }

        return this.#obs[key];
    }

}

