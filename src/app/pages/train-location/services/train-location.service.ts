import { inject, Injectable } from '@angular/core';
import { from, Observable, of } from 'rxjs';
import { map, mergeMap, tap } from 'rxjs/operators';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { RouteService } from 'src/app/libs/route/usecase/route.service';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import { TrainLocationStore } from '../stores/train-location.store';

/** 目撃クロスセクションの同時取得数（operation-real-time.service.ts と同一値） */
const FORMATION_FETCH_CONCURRENCY = 5;

@Injectable()
export class TrainLocationService {
    readonly #routeService = inject(RouteService);
    readonly #tripClassService = inject(TripClassService);
    readonly #tripBlockService = inject(TripBlockService);
    readonly #operationSightingService = inject(OperationSightingService);

    fetchTripClasses(): Observable<void> {
        return this.#tripClassService.findMany({}).pipe(
            tap((data) => {
                TrainLocationStore.setTripClasses(data);
            }),
            map(() => undefined),
        );
    }

    /**
     * 指定 calendarId の全列車データ（上下バルク）を取得する。
     * `TripBlockService.findManyByCalendarId` は infrastructure 層で calendarId をキーに
     * キャッシュされるため、train-diagram（N1）と同一 calendarId であればページ間遷移でも
     * 再取得しない（35-architecture-new-pages.md §1.2）。
     */
    fetchTripBlocks(): Observable<void> {
        const calendarId = TrainLocationStore.calendarId;

        if (!calendarId) {
            TrainLocationStore.setTripBlocksByDirection({});
            return of(undefined);
        }

        return this.#tripBlockService
            .findManyByCalendarId({ calendarId })
            .pipe(
                tap((data) => {
                    TrainLocationStore.setTripBlocksByDirection(data);
                }),
                map(() => undefined),
            );
    }

    /** 選択路線の駅軸（stationSequence 昇順）を取得する。 */
    fetchStationAxis(): Observable<void> {
        const routeId = TrainLocationStore.selectedRouteId;

        if (!routeId) {
            TrainLocationStore.setStationAxisStations([]);
            return of(undefined);
        }

        return this.#routeService.findOneWithStations({ routeId }).pipe(
            tap(({ stations }) => {
                const ordered = [...stations].sort(
                    (a, b) => (a.stationSequence ?? 0) - (b.stationSequence ?? 0),
                );
                TrainLocationStore.setStationAxisStations(ordered);
            }),
            map(() => undefined),
        );
    }

    /**
     * まだキャッシュされていない operationNumber のみを対象に、目撃クロスセクション
     * （充当編成番号の根拠）を取得する。今日有効なダイヤ表示時のみ呼び出し側が呼ぶ。
     */
    fetchMissingOperationSightingTimeCrossSections(
        operationNumbers: readonly string[],
    ): Observable<void> {
        const cached = TrainLocationStore.operationSightingTimeCrossSections;
        const missing = Array.from(new Set(operationNumbers)).filter(
            (operationNumber) => !cached[operationNumber],
        );

        if (!missing.length) {
            return of(undefined);
        }

        return from(missing).pipe(
            mergeMap(
                (operationNumber) =>
                    this.#operationSightingService
                        .findOneTimeCrossSectionByOperationNumber({
                            operationNumber,
                        })
                        .pipe(
                            tap((data) => {
                                TrainLocationStore.setOperationSightingTimeCrossSection(
                                    operationNumber,
                                    data,
                                );
                            }),
                        ),
                FORMATION_FETCH_CONCURRENCY,
            ),
            map(() => undefined),
        );
    }
}
