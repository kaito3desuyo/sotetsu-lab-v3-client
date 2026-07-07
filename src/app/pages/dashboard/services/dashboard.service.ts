import { inject, Injectable } from '@angular/core';
import { format } from 'date-fns';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, first, map, tap } from 'rxjs/operators';
import { getRailwayDate } from 'src/app/core/utils/railway-day';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import { estimatePositions } from 'src/app/shared/train-position.util';
import { buildNetworkStationAxis } from '../utils/build-network-station-axis.util';
import { DashboardStore } from '../stores/dashboard.store';

@Injectable()
export class DashboardService {
    readonly #todaysCalendarListStateQuery = inject(
        TodaysCalendarListStateQuery,
    );
    readonly #calendarListStateQuery = inject(CalendarListStateQuery);
    readonly #routeStationListStateQuery = inject(RouteStationListStateQuery);
    readonly #tripBlockService = inject(TripBlockService);
    readonly #operationSightingService = inject(OperationSightingService);
    readonly #operationService = inject(OperationService);

    /** 今日有効なダイヤ（todaysCalendarList 由来）を取得する。 */
    fetchTodaysCalendar(): Observable<void> {
        const calendarId = this.#todaysCalendarListStateQuery.todaysCalendarId;

        if (!calendarId) {
            DashboardStore.setTodaysCalendar(null);
            return of(undefined);
        }

        return this.#calendarListStateQuery.selectByCalendarId(calendarId).pipe(
            first(),
            tap((calendar) => {
                DashboardStore.setTodaysCalendar(calendar ?? null);
            }),
            map(() => undefined),
        );
    }

    /**
     * 「計画走行本数」を N2 の位置算出 util（estimatePositions）を流用して算出する。
     * 路線を絞り込まず、対象サービス範囲の全路線を統合した駅軸で今この瞬間の在線数を数える。
     */
    fetchRunningTripCount(): Observable<void> {
        const calendar = DashboardStore.todaysCalendar;

        if (!calendar) {
            DashboardStore.setRunningTripCount(0);
            return of(undefined);
        }

        return forkJoin({
            tripBlocksByDirection: this.#tripBlockService.findManyByCalendarId(
                {
                    calendarId: calendar.calendarId,
                },
            ),
            routes: this.#routeStationListStateQuery.routeStations$.pipe(
                first(),
            ),
        }).pipe(
            tap(({ tripBlocksByDirection, routes }) => {
                const tripBlocks = Object.values(tripBlocksByDirection).flat();
                const stationAxis = buildNetworkStationAxis(routes);
                const positions = estimatePositions(
                    tripBlocks,
                    stationAxis,
                    new Date(),
                );
                DashboardStore.setRunningTripCount(positions.length);
            }),
            map(() => undefined),
        );
    }

    /** 本日（鉄道日）の目撃投稿数・最新3件を取得する。 */
    fetchTodaysSightings(): Observable<void> {
        const date = format(getRailwayDate(new Date()), 'yyyy-MM-dd');

        return this.#operationSightingService
            .findManyBySpecificPeriod({ from: date, to: date })
            .pipe(
                tap((sightings) => {
                    const sorted = [...sightings].sort(
                        (a, b) =>
                            new Date(b.sightingTime ?? 0).getTime() -
                            new Date(a.sightingTime ?? 0).getTime(),
                    );
                    DashboardStore.setSightingCountToday(sightings.length);
                    DashboardStore.setLatestSightings(sorted.slice(0, 3));
                }),
                map(() => undefined),
            );
    }

    /**
     * 最新の目撃3件それぞれについて、目撃時刻時点の運用の位置（現在位置API）を取得する。
     * 取得できない（404 等）場合は非表示にするため、失敗しても全体は継続する。
     */
    fetchLatestSightingPositions(): Observable<void> {
        const sightings = DashboardStore.latestSightings;

        if (sightings.length === 0) {
            return of(undefined);
        }

        return forkJoin(
            sightings.map((sighting) =>
                sighting.operationId
                    ? this.#operationService
                          .findOneWithCurrentPosition({
                              operationId: sighting.operationId,
                              searchTime: sighting.sightingTime,
                          })
                          .pipe(
                              tap((position) => {
                                  DashboardStore.setLatestSightingPosition(
                                      sighting.operationSightingId,
                                      position,
                                  );
                              }),
                              catchError(() => of(undefined)),
                          )
                    : of(undefined),
            ),
        ).pipe(map(() => undefined));
    }
}
