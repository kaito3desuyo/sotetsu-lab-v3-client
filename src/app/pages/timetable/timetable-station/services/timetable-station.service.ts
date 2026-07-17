import { inject, Injectable } from '@angular/core';
import { from, Observable, of } from 'rxjs';
import { catchError, map, mergeMap, tap } from 'rxjs/operators';
import { CalendarService } from 'src/app/libs/calendar/usecase/calendar.service';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { StationService } from 'src/app/libs/station/usecase/station.service';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { TripService } from 'src/app/libs/trip/usecase/trip.service';
import { TimetableStationStore } from '../stores/timetable-station.store';

@Injectable()
export class TimetableStationService {
    readonly #calendarService = inject(CalendarService);
    readonly #stationService = inject(StationService);
    readonly #tripService = inject(TripService);
    readonly #tripBlockService = inject(TripBlockService);
    readonly #tripClassService = inject(TripClassService);
    readonly #operationService = inject(OperationService);
    readonly #operationSightingService = inject(OperationSightingService);

    fetchCalendar(): Observable<void> {
        const calendarId = TimetableStationStore.calendarId;

        // calendar 未選択（初期状態など）では /v3/calendars/null を叩かない。
        if (!calendarId) {
            return of(undefined);
        }

        return this.#calendarService.findOne({ calendarId }).pipe(
            tap((data: CalendarDetailsDto) => {
                TimetableStationStore.setCalendar(data);
            }),
            map(() => undefined),
        );
    }

    fetchTrips(): Observable<void> {
        const stationId = TimetableStationStore.stationId;
        const calendarId = TimetableStationStore.calendarId;
        const tripDirection = TimetableStationStore.tripDirection;

        // 駅・ダイヤ未選択（初期状態）では /v3/trips/station/null を叩かない。
        if (!stationId || !calendarId) {
            return of(undefined);
        }

        return this.#tripService
            .findManyByStationId({ stationId, calendarId, tripDirection })
            .pipe(
                tap((data: TripDetailsDto[]) => {
                    TimetableStationStore.setTrips(data);
                }),
                map(() => undefined),
            );
    }

    /**
     * G1（通し運行脚注行が実画面で出ない問題の修正）: 旧実装は駅の全 trip の
     * tripBlockId ごとに findOneById を forkJoin していた（横浜・平日・上りで
     * 324 並列 HTTP）。1 件でも失敗すると forkJoin 全体が reject し、
     * tripBlocks が空のまま（=脚注行 0 件）＆後続の目撃クロスセクション取得も
     * 走らない（=充当編成「不明」）という実行時全滅モードがあった。
     * calendarId+tripDirection のバルク 1 リクエスト（ブロックの全メンバー trip
     * 込みで返る）に置き換える。取得件数は増えるが、ダイヤグラム等 N1〜N3 と
     * 同一の shareReplay キャッシュに乗るためページ間で再利用される。
     */
    fetchTripBlocks(): Observable<void> {
        const calendarId = TimetableStationStore.calendarId;
        const tripDirection = TimetableStationStore.tripDirection;

        if (!calendarId || tripDirection === null) {
            TimetableStationStore.setTripBlocks([]);
            return of(undefined);
        }

        return this.#tripBlockService
            .findManyByFilter({ calendarId, tripDirection })
            .pipe(
                tap((data) => {
                    TimetableStationStore.setTripBlocks(data);
                }),
                map(() => undefined),
                // tripBlocks は脚注行（3段目）専用の付加データ。取得失敗時は
                // fetchData ごと reject させず（=ローディング残留・以後の再描画
                // 停止を防ぐ）、脚注なしのグレースフルデグラデーションに留める。
                catchError(() => {
                    TimetableStationStore.setTripBlocks([]);
                    return of(undefined);
                }),
            );
    }

    fetchTripClasses(): Observable<void> {
        return this.#tripClassService.findMany({}).pipe(
            tap((data: TripClassDetailsDto[]) => {
                TimetableStationStore.setTripClasses(data);
            }),
            map(() => undefined),
        );
    }

    fetchStations(): Observable<void> {
        return this.#stationService.findMany({}).pipe(
            tap((data: StationDetailsDto[]) => {
                TimetableStationStore.setStations(data);
            }),
            map(() => undefined),
        );
    }

    fetchOperations(): Observable<void> {
        const calendarId = TimetableStationStore.calendarId;

        return this.#operationService.findManyByCalendarId({ calendarId }).pipe(
            map((data) => data.filter((o) => o.operationNumber !== '100')),
            tap((data: OperationDetailsDto[]) => {
                TimetableStationStore.setOperations(data);
            }),
            map(() => undefined),
        );
    }

    /**
     * B7: 過去ダイヤ表示時は呼び出し側（コンポーネント）がこのメソッド自体を呼ばず、
     * ストアへ空 Record を設定する。ここでは「今日有効なダイヤ」表示時のフェッチのみを担う。
     *
     * G1（充当編成「不明」バグ修正）: operation-real-time-service と同じ
     * requestした operationNumber をキーに使う方式に統一（詳細はストアのコメント参照）。
     */
    fetchOperationSightingTimeCrossSections(): Observable<void> {
        const operationIds = TimetableStationStore.operationIds;
        const operations = TimetableStationStore.operations.filter((o) =>
            operationIds.includes(o.operationId),
        );

        if (operations.length === 0) {
            TimetableStationStore.resetOperationSightingTimeCrossSections();
            return of(undefined);
        }

        return from(operations).pipe(
            mergeMap(
                ({ operationNumber }) =>
                    this.#operationSightingService
                        .findOneTimeCrossSectionByOperationNumber({
                            operationNumber,
                        })
                        .pipe(
                            tap((data) => {
                                TimetableStationStore.setOperationSightingTimeCrossSection(
                                    operationNumber,
                                    data,
                                );
                            }),
                            // T6.8 再差し戻し（初回ロードで充当編成が全滅する回帰）:
                            // 1 運用分の HTTP が失敗すると mergeMap ストリーム全体が
                            // error 終了し、残り全運用の取得が中断して全セル「不明」の
                            // まま固まる。失敗した運用のみ「不明」に留め、他は継続する。
                            catchError(() => of(undefined)),
                        ),
                5,
            ),
            map(() => undefined),
        );
    }
}
