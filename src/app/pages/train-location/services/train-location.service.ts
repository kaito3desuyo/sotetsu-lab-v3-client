import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { RouteService } from 'src/app/libs/route/usecase/route.service';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import { TRIP_BLOCK_TIMELINE_FIELDS } from 'src/app/libs/trip-block/usecase/trip-block-fields';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import { TrainLocationStore } from '../stores/train-location.store';
import { attachTripClasses } from 'src/app/shared/attach-trip-classes.util';

@Injectable()
export class TrainLocationService {
    readonly #store = inject(TrainLocationStore);
    readonly #routeService = inject(RouteService);
    readonly #tripClassService = inject(TripClassService);
    readonly #tripBlockService = inject(TripBlockService);
    readonly #operationSightingService = inject(OperationSightingService);
    readonly #operationService = inject(OperationService);

    fetchTripClasses(): Observable<void> {
        return this.#tripClassService.findMany({}).pipe(
            tap((data) => {
                this.#store.setTripClasses(data);
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
        const calendarId = this.#store.calendarId();

        if (!calendarId) {
            this.#store.setTripBlocksByDirection({});
            return of(undefined);
        }

        return this.#tripBlockService
            .findManyByCalendarId({
                calendarId,
                fields: TRIP_BLOCK_TIMELINE_FIELDS,
            })
            .pipe(
                tap((data) => {
                    this.#store.setTripBlocksByDirection(
                        attachTripClasses(data, this.#store.tripClasses()),
                    );
                }),
                map(() => undefined),
            );
    }

    /**
     * 運用の乗り移りを見分けるつながり（運用表・行路図・列車ダイヤグラムと同じ口）を取る。
     * 折返しの判定にだけ使うので、取れなくても空として扱い（従来の判定のまま）、ページは止めない。
     * 取れなかったことは failed で返す（呼び出し側が、劣化した中身を圏外用に保存しないため）。
     */
    fetchItineraryLinks(): Observable<{ failed: boolean }> {
        const calendarId = this.#store.calendarId();

        if (!calendarId) {
            this.#store.setItineraryLinks([]);
            return of({ failed: false });
        }

        return this.#operationService
            .findManyItineraryLinks({ calendarId })
            .pipe(
                tap((links) => {
                    this.#store.setItineraryLinks(links);
                }),
                map(() => ({ failed: false })),
                catchError(() => {
                    this.#store.setItineraryLinks([]);
                    return of({ failed: true });
                }),
            );
    }

    /** 選択路線の駅軸（stationSequence 昇順）を取得する。 */
    fetchStationAxis(): Observable<void> {
        const routeId = this.#store.selectedRouteId();

        if (!routeId) {
            this.#store.setStationAxisStations([]);
            return of(undefined);
        }

        return this.#routeService.findOneWithStations({ routeId }).pipe(
            tap(({ stations }) => {
                const ordered = [...stations].sort(
                    (a, b) =>
                        (a.stationSequence ?? 0) - (b.stationSequence ?? 0),
                );
                this.#store.setStationAxisStations(ordered);
            }),
            map(() => undefined),
        );
    }

    /**
     * まだキャッシュされていない operationNumber のみを対象に、目撃クロスセクション
     * （充当編成番号の根拠）を取得する。今日有効なダイヤ表示時のみ呼び出し側が呼ぶ。
     * 新しく取れたら true、取るものが無かったら false を返す（呼び出し側が圏外用に保存するか決める）。
     */
    fetchMissingOperationSightingTimeCrossSections(
        operationNumbers: readonly string[],
    ): Observable<boolean> {
        const cached = this.#store.operationSightingTimeCrossSections();
        const missing = Array.from(new Set(operationNumbers)).filter(
            (operationNumber) => !cached[operationNumber],
        );

        if (!missing.length) {
            return of(false);
        }

        // 運用ごとに 1 本ずつ取っていたのを、まとめて返す口 1 本にする（api ADR-0003）
        return this.#operationSightingService
            .findManyTimeCrossSectionsByOperationNumbers({
                operationNumbers: missing,
            })
            .pipe(
                tap((data) => {
                    for (const [
                        operationNumber,
                        crossSection,
                    ] of Object.entries(data)) {
                        this.#store.setOperationSightingTimeCrossSection(
                            operationNumber,
                            crossSection,
                        );
                    }
                }),
                map(() => true),
            );
    }
}
