import { inject, Injectable } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, finalize, map, switchMap, tap } from 'rxjs/operators';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { CalendarService } from 'src/app/libs/calendar/usecase/calendar.service';
import { FormationService } from 'src/app/libs/formation/usecase/formation.service';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TRIP_BLOCK_TIMELINE_FIELDS } from 'src/app/libs/trip-block/usecase/trip-block-fields';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import {
    OperationViewKind,
    TimetableOperationStore,
} from '../stores/timetable-operation.store';

/** その運用の、無効でない今日の目撃（引き継ぎを除く）があるか */
function hasOwnSighting(
    sightings: OperationSightingDetailsDto[],
    operationId: string,
): boolean {
    return sightings.some(
        (s) =>
            s.operationId === operationId &&
            !s.invalidation &&
            !s.sightedAsOperation &&
            !s.carriedFromSightingId,
    );
}

@Injectable()
export class TimetableOperationService {
    readonly #calendarService = inject(CalendarService);
    readonly #formationService = inject(FormationService);
    readonly #operationService = inject(OperationService);
    readonly #operationSightingService = inject(OperationSightingService);
    readonly #tripBlockService = inject(TripBlockService);
    readonly #store = inject(TimetableOperationStore);

    /**
     * 運用の 1 日分（日付の形）か、そのダイヤでの並び（ダイヤの形）を取ってストアへ入れる。
     * ダイヤや運用が無くてもエラーにせず、noCalendar / notFound で表す。取得の失敗は loadError
     */
    fetch(params: {
        operationNumber: string;
        date: string | null;
        calendarId: string | null;
        viewKind: OperationViewKind;
        forceReload?: boolean;
    }): Observable<void> {
        const { operationNumber, date, calendarId, viewKind, forceReload } =
            params;
        const seq = this.#store.nextFetchSeq();
        const latest = (): boolean => this.#store.isLatestFetch(seq);
        this.#store.start({
            operationNumber,
            date: viewKind === 'calendar' ? null : date,
            viewKind,
        });
        this.#store.enableLoading();
        let failed = false;
        const fail = <T>(fallback: T): Observable<T> => {
            failed = true;
            return of(fallback);
        };
        const byDate = viewKind !== 'calendar' && !!date;

        const calendar$: Observable<CalendarDetailsDto | null> = byDate
            ? this.#calendarService.findOneBySpecificDate({
                  date: date!,
                  forceReload,
              })
            : calendarId
              ? this.#calendarService.findOne({ calendarId, forceReload })
              : of(null);

        return forkJoin({
            calendar: calendar$.pipe(catchError(() => fail(null))),
            sightings: byDate
                ? this.#operationSightingService
                      .findManyBySpecificPeriod({
                          from: date!,
                          to: date!,
                          includeCarriedOver: true,
                          forceReload,
                      })
                      .pipe(
                          catchError(() =>
                              fail<OperationSightingDetailsDto[]>([]),
                          ),
                      )
                : of<OperationSightingDetailsDto[]>([]),
            formations: byDate
                ? this.#formationService
                      .findManyBySpecificDate({ date: date!, forceReload })
                      .pipe(catchError(() => fail([])))
                : of([]),
        }).pipe(
            switchMap((r) => {
                if (!latest()) return of(undefined);
                this.#store.setCalendar(r.calendar);
                this.#store.setSightings(r.sightings);
                this.#store.setFormationNumbers(r.formations);
                if (!r.calendar) return of(undefined);
                const cid = r.calendar.calendarId;
                return this.#operationService
                    .findManyByCalendarId({ calendarId: cid, forceReload })
                    .pipe(
                        catchError(() => fail([])),
                        switchMap((operations) => {
                            if (!latest()) return of(undefined);
                            this.#store.setOperations(operations);
                            const op = this.#store.operation();
                            if (!op) return of(undefined);
                            const needsInference =
                                viewKind === 'today' &&
                                !hasOwnSighting(r.sightings, op.operationId);
                            return forkJoin({
                                trips: this.#operationService
                                    .findOneWithTrips({
                                        operationId: op.operationId,
                                        forceReload,
                                    })
                                    .pipe(catchError(() => fail(null))),
                                links: this.#operationService
                                    .findManyItineraryLinks({
                                        calendarId: cid,
                                        forceReload,
                                    })
                                    .pipe(catchError(() => fail([]))),
                                times: this.#fetchTimesByTripId(
                                    cid,
                                    forceReload,
                                ).pipe(
                                    catchError(() =>
                                        fail(
                                            new Map<string, TimeDetailsDto[]>(),
                                        ),
                                    ),
                                ),
                                inferred: needsInference
                                    ? this.#inferFormationNumber(
                                          operationNumber,
                                          forceReload,
                                      )
                                    : of(null),
                            }).pipe(
                                tap(({ trips, links, times, inferred }) => {
                                    if (!latest()) return;
                                    this.#store.setTrips(
                                        trips
                                            ? attachTimes(trips, times)
                                            : null,
                                    );
                                    this.#store.setLinks(links);
                                    this.#store.setInferredFormationNumber(
                                        inferred,
                                    );
                                }),
                            );
                        }),
                    );
            }),
            tap(() => {
                if (!latest()) return;
                this.#store.setLoadError(failed);
                this.#store.setLoaded(true);
            }),
            map(() => undefined),
            finalize(() => this.#store.disableLoading()),
        );
    }

    /** socket 用。今日だけ、目撃だけを取り直す（ダイヤの列車は取り直さない） */
    refetchSightings(): Observable<void> {
        const date = this.#store.date();
        if (this.#store.viewKind() !== 'today' || !date) return of(undefined);
        const seq = this.#store.currentFetchSeq();
        return this.#operationSightingService
            .findManyBySpecificPeriod({
                from: date,
                to: date,
                includeCarriedOver: true,
                forceReload: true,
            })
            .pipe(
                tap((sightings) => {
                    if (this.#store.isLatestFetch(seq)) {
                        this.#store.setSightings(sightings);
                    }
                }),
                map(() => undefined),
                // 取り直しの失敗は表示中の中身を残す
                catchError(() => of(undefined)),
            );
    }

    /** いまの位置（今日だけ） */
    fetchCurrentPosition(): Observable<void> {
        const op = this.#store.operation();
        if (this.#store.viewKind() !== 'today' || !op) {
            this.#store.setCurrentPosition(null);
            return of(undefined);
        }
        const seq = this.#store.currentFetchSeq();
        return this.#operationService
            .findOneWithCurrentPosition({
                operationId: op.operationId,
                forceReload: true,
            })
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

    /** time-cross-section が今その運用に入っていると見る編成の番号。推し量りなので失敗しても出さないだけ */
    #inferFormationNumber(
        operationNumber: string,
        forceReload: boolean | undefined,
    ): Observable<string | null> {
        return this.#operationSightingService
            .findOneTimeCrossSectionByOperationNumber({
                operationNumber,
                forceReload,
            })
            .pipe(
                map(
                    (cs) =>
                        cs?.expectedSighting?.formation?.formationNumber ??
                        null,
                ),
                catchError(() => of(null)),
            );
    }

    /** そのダイヤの全列車の時刻を、列車 id ごとに stopSequence 順で（編成別時刻表と同じ取り方） */
    #fetchTimesByTripId(
        calendarId: string,
        forceReload: boolean | undefined,
    ): Observable<Map<string, TimeDetailsDto[]>> {
        return this.#tripBlockService
            .findManyByCalendarId({
                calendarId,
                fields: TRIP_BLOCK_TIMELINE_FIELDS,
                forceReload,
            })
            .pipe(
                map((byDirection) => {
                    const result = new Map<string, TimeDetailsDto[]>();
                    for (const blocks of Object.values(byDirection)) {
                        for (const block of blocks) {
                            for (const trip of block.trips ?? []) {
                                result.set(
                                    trip.tripId,
                                    [...(trip.times ?? [])].sort(
                                        (a, b) =>
                                            (a.stopSequence ?? 0) -
                                            (b.stopSequence ?? 0),
                                    ),
                                );
                            }
                        }
                    }
                    return result;
                }),
            );
    }
}

/** 運用の各列車に、trip-block から取った時刻を付ける（運用の列車の api は時刻を返さない） */
function attachTimes(
    dto: OperationTripsDto,
    timesByTripId: ReadonlyMap<string, TimeDetailsDto[]>,
): OperationTripsDto {
    return {
        ...dto,
        trips: dto.trips.map((tol) => {
            const tripId = tol.tripId ?? tol.trip?.tripId;
            const times = tripId ? timesByTripId.get(tripId) : undefined;
            if (!times || !tripId) return tol;
            return { ...tol, trip: { ...tol.trip, tripId, times } };
        }),
    };
}
