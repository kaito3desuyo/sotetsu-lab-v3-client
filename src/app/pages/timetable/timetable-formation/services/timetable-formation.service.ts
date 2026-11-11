import { inject, Injectable } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, finalize, map, switchMap, tap } from 'rxjs/operators';
import { CalendarService } from 'src/app/libs/calendar/usecase/calendar.service';
import { FormationService } from 'src/app/libs/formation/usecase/formation.service';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { StationService } from 'src/app/libs/station/usecase/station.service';
import {
    FormationDateKind,
    TimetableFormationStore,
} from '../stores/timetable-formation.store';
import { missingOperationIds } from '../utils/formation-day.util';
import { selectFormationOnDate } from '../utils/select-formation.util';

type CrossSectionResult = {
    operationId: string | null;
    carriedOver: boolean;
};
const NO_CROSS_SECTION: CrossSectionResult = {
    operationId: null,
    carriedOver: false,
};

/** 'yyyy-MM-dd' の翌日 */
function nextDate(date: string): string {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
}

@Injectable()
export class TimetableFormationService {
    readonly #calendarService = inject(CalendarService);
    readonly #formationService = inject(FormationService);
    readonly #stationService = inject(StationService);
    readonly #operationService = inject(OperationService);
    readonly #operationSightingService = inject(OperationSightingService);
    readonly #store = inject(TimetableFormationStore);

    /**
     * 編成の 1 日分（目撃・最初の運用・乗り移り・運用の列車）を取ってストアへ入れる。
     * 編成やダイヤが無くてもエラーにせず、notFound / noCalendar で表す。
     * date は営業日 'yyyy-MM-dd'。今日・明日は呼び出し側が dateKind で決める。
     */
    fetchDay(params: {
        formationNumber: string;
        date: string;
        dateKind: FormationDateKind;
        forceReload?: boolean;
    }): Observable<void> {
        const { formationNumber, date, dateKind, forceReload } = params;
        const seq = this.#store.nextFetchSeq();
        this.#store.startDay({ formationNumber, date, dateKind });
        this.#store.enableLoading();
        const latest = (): boolean => this.#store.isLatestFetch(seq);
        // 取得の失敗は「ダイヤ無し」「編成無し」でなく loadError で表す
        let failed = false;
        const fail = <T>(fallback: T): Observable<T> => {
            failed = true;
            return of(fallback);
        };

        return forkJoin({
            calendar: this.#calendarService
                .findOneBySpecificDate({ date, forceReload })
                .pipe(catchError(() => fail(null))),
            formations: this.#formationService
                .findManyBySpecificDate({ date, forceReload })
                .pipe(catchError(() => fail([]))),
            // 明日の目撃は無い。api は date から翌日 4 時までを返す（過去の画面と同じ渡し方）
            sightings:
                dateKind === 'tomorrow'
                    ? of<OperationSightingDetailsDto[]>([])
                    : this.#operationSightingService
                          .findManyBySpecificPeriod({
                              from: date,
                              to: date,
                              includeCarriedOver: true,
                              forceReload,
                          })
                          .pipe(catchError(() => fail([]))),
            // 今日の画面だけ、明日が選べるかを調べる
            tomorrowOperationId:
                dateKind === 'today'
                    ? this.#crossSection(
                          formationNumber,
                          `${nextDate(date)}T12:00:00+09:00`,
                          forceReload,
                      ).pipe(map((cs) => cs.operationId))
                    : of<string | null>(null),
            stations: this.#store.stations().length
                ? of(null)
                : this.#stationService
                      .findMany({})
                      .pipe(catchError(() => of(null))),
        }).pipe(
            switchMap((r) => {
                if (!latest()) return of(undefined);
                if (r.stations) this.#store.setStations(r.stations);
                const formation = selectFormationOnDate(
                    r.formations,
                    formationNumber,
                    date,
                );
                this.#store.setLoadError(failed);
                this.#store.setCalendar(r.calendar ?? null);
                this.#store.setFormation(formation);
                this.#store.setSightings(r.sightings);
                this.#store.setTomorrowOperationId(r.tomorrowOperationId);
                if (!formation || !r.calendar) {
                    this.#store.setLoaded(true);
                    return of(undefined);
                }
                const hasOwnSighting = r.sightings.some(
                    (s) =>
                        s.formationId === formation.formationId &&
                        !s.invalidation,
                );
                const first$: Observable<CrossSectionResult> =
                    dateKind === 'tomorrow'
                        ? this.#crossSection(
                              formationNumber,
                              `${date}T12:00:00+09:00`,
                              forceReload,
                          )
                        : dateKind !== 'today' || hasOwnSighting
                          ? of(NO_CROSS_SECTION)
                          : this.#crossSection(
                                formationNumber,
                                undefined,
                                forceReload,
                            );
                return forkJoin({
                    first: first$,
                    links: this.#operationService
                        .findManyItineraryLinks({
                            calendarId: r.calendar.calendarId,
                            forceReload,
                        })
                        .pipe(catchError(() => fail([]))),
                }).pipe(
                    switchMap(({ first, links }) => {
                        if (!latest()) return of(undefined);
                        this.#store.setFirstOperationId(first.operationId);
                        this.#store.setFirstBasis(
                            hasOwnSighting
                                ? 'sighting'
                                : first.carriedOver
                                  ? 'carried-over'
                                  : first.operationId
                                    ? 'circulated'
                                    : 'unknown',
                        );
                        this.#store.setLinks(links);
                        return this.#fetchMissingTrips(
                            latest,
                            new Set<string>(),
                            forceReload,
                            () => {
                                failed = true;
                            },
                        );
                    }),
                    tap(() => {
                        if (!latest()) return;
                        this.#store.setLoadError(failed);
                        this.#store.setLoaded(true);
                    }),
                );
            }),
            map(() => undefined),
            finalize(() => this.#store.disableLoading()),
        );
    }

    /** socket 用。今日だけ、目撃だけを取り直す（足りない運用の列車は取り足す） */
    refetchSightings(): Observable<void> {
        const date = this.#store.date();
        const formation = this.#store.formation();
        if (this.#store.dateKind() !== 'today' || !date || !formation) {
            return of(undefined);
        }
        const seq = this.#store.currentFetchSeq();
        const latest = (): boolean => this.#store.isLatestFetch(seq);

        return this.#operationSightingService
            .findManyBySpecificPeriod({
                from: date,
                to: date,
                includeCarriedOver: true,
                forceReload: true,
            })
            .pipe(
                switchMap((sightings) => {
                    if (!latest()) return of(undefined);
                    this.#store.setSightings(sightings);
                    return this.#fetchMissingTrips(
                        latest,
                        new Set(Object.keys(this.#store.tripsByOperationId())),
                        true,
                    );
                }),
                map(() => undefined),
                // 取り直しの失敗は表示中の中身を残す
                catchError(() => of(undefined)),
            );
    }

    /** いまの位置（今日だけ）。どの運用か（走っている列車の運用）は呼び出し側が決めて渡す */
    fetchCurrentPosition(operationId: string): Observable<void> {
        if (this.#store.dateKind() !== 'today') {
            this.#store.setCurrentPosition(null);
            return of(undefined);
        }
        const seq = this.#store.currentFetchSeq();
        return this.#operationService
            .findOneWithCurrentPosition({ operationId, forceReload: true })
            .pipe(
                catchError(() => of(null)),
                tap((position) => {
                    if (this.#store.isLatestFetch(seq)) {
                        this.#store.setCurrentPosition(position ?? null);
                    }
                }),
                map(() => undefined),
            );
    }

    /** time-cross-section の予想の運用 id と、引き継ぎの目撃かどうか。無い・失敗は運用なし */
    #crossSection(
        formationNumber: string,
        searchTime: string | undefined,
        forceReload: boolean | undefined,
    ): Observable<CrossSectionResult> {
        return this.#operationSightingService
            .findOneTimeCrossSectionByFormationNumber({
                formationNumber,
                searchTime,
                forceReload,
            })
            .pipe(
                map((cs) => ({
                    operationId:
                        cs?.expectedSighting?.operation?.operationId ?? null,
                    carriedOver: !!cs?.sightedAsOperation,
                })),
                catchError(() => of(NO_CROSS_SECTION)),
            );
    }

    /**
     * たどるのに要る運用の列車を、足りなくなくなるまで取る。
     * 一度頼んだ id は二度頼まない（api が返さない運用で止まらなくなるのを防ぐ）。
     */
    #fetchMissingTrips(
        latest: () => boolean,
        requested: Set<string>,
        forceReload: boolean | undefined,
        onError?: () => void,
    ): Observable<void> {
        const input = this.#store.dayInput();
        if (!input || !latest()) return of(undefined);
        const ids = missingOperationIds(input).filter(
            (id) => !requested.has(id),
        );
        if (ids.length === 0) return of(undefined);
        ids.forEach((id) => requested.add(id));

        return forkJoin(
            ids.map((operationId) =>
                this.#operationService
                    .findOneWithTrips({ operationId, forceReload })
                    .pipe(
                        map((dto) => ({ operationId, dto })),
                        catchError(() => {
                            onError?.();
                            return of({ operationId, dto: null });
                        }),
                    ),
            ),
        ).pipe(
            switchMap((results) => {
                if (!latest()) return of(undefined);
                const got: Record<string, OperationTripsDto> = {};
                for (const { operationId, dto } of results) {
                    if (dto) got[operationId] = dto;
                }
                this.#store.addTrips(got);
                return this.#fetchMissingTrips(
                    latest,
                    requested,
                    forceReload,
                    onError,
                );
            }),
        );
    }
}
