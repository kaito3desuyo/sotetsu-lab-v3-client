import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { CalendarService } from 'src/app/libs/calendar/usecase/calendar.service';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { StationService } from 'src/app/libs/station/usecase/station.service';
import {
    TRIP_BLOCK_TIMELINE_FIELDS,
    TripBlockFields,
} from 'src/app/libs/trip-block/usecase/trip-block-fields';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import { TimetableStationStore } from '../stores/timetable-station.store';
import { stationTrips } from '../utils/station-trips.util';

/**
 * 脚注（同じ運行の後続列車・行き先）と並べ替えに使う時刻の組に、その駅に停まるかの判定に要る
 * 乗降の可否を足したもの。共有の組に足すと他ページも約 2 割重くなるので、このページだけで使う。
 */
const TIMETABLE_STATION_FIELDS: TripBlockFields = {
    ...TRIP_BLOCK_TIMELINE_FIELDS,
    time: [...TRIP_BLOCK_TIMELINE_FIELDS['time'], 'pickupType', 'dropoffType'],
};

@Injectable()
export class TimetableStationService {
    readonly #calendarService = inject(CalendarService);
    readonly #stationService = inject(StationService);
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

    /**
     * 方向ごとの運行（trip-block）を 1 本で取り、脚注用の運行とその駅に停まる列車の両方をストアへ入れる。
     * 以前は駅ごとに `/v3/trips/station`（横浜・平日・上りで約 1.6MB）も取っていた。運行は方向ごとに
     * キャッシュされるので、駅を切り替えても取り直さない（行の条件と順は `stationTrips`）。
     */
    fetchTrips(): Observable<void> {
        const stationId = TimetableStationStore.stationId;
        const calendarId = TimetableStationStore.calendarId;
        const tripDirection = TimetableStationStore.tripDirection;

        // 駅・ダイヤ未選択（初期状態）では取りに行かない。
        if (!stationId || !calendarId || tripDirection === null) {
            return of(undefined);
        }

        return this.#tripBlockService
            .findManyByFilter({
                calendarId,
                tripDirection,
                fields: TIMETABLE_STATION_FIELDS,
            })
            .pipe(
                tap((tripBlocks) => {
                    TimetableStationStore.setTripBlocks(tripBlocks);
                    TimetableStationStore.setTrips(
                        stationTrips(tripBlocks, stationId, tripDirection),
                    );
                }),
                map(() => undefined),
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

        // 運用ごとに 1 本ずつ取っていたのを、まとめて返す口 1 本にする（api ADR-0003）。
        // 失敗しても充当編成が「不明」になるだけで、ページは止めない。
        return this.#operationSightingService
            .findManyTimeCrossSectionsByOperationNumbers({
                operationNumbers: operations.map((o) => o.operationNumber),
            })
            .pipe(
                tap((data) => {
                    for (const [
                        operationNumber,
                        crossSection,
                    ] of Object.entries(data)) {
                        TimetableStationStore.setOperationSightingTimeCrossSection(
                            operationNumber,
                            crossSection,
                        );
                    }
                }),
                map(() => undefined),
                catchError(() => of(undefined)),
            );
    }
}
