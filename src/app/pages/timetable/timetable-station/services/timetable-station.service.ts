import { isPlatformServer } from '@angular/common';
import {
    inject,
    Injectable,
    makeStateKey,
    PLATFORM_ID,
    TransferState,
} from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { QueryInvalidator } from 'src/app/core/query-cache/query-invalidator';
import { skipTransferCacheContext } from 'src/app/core/ssr/skip-transfer-cache';
import { CalendarService } from 'src/app/libs/calendar/usecase/calendar.service';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import {
    TRIP_BLOCK_TIMELINE_FIELDS,
    TripBlockFields,
} from 'src/app/libs/trip-block/usecase/trip-block-fields';
import { TripBlockWithTripsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import { TimetableStationStore } from '../stores/timetable-station.store';
import { pruneStationTripBlocks } from '../utils/prune-station-trip-blocks.util';
import { stationTrips } from '../utils/station-trips.util';

/**
 * 脚注（同じ運行の後続列車・行き先）と並べ替えに使う時刻の組に、その駅に停まるかの判定に要る
 * 乗降の可否を足したもの。共有の組に足すと他ページも約 2 割重くなるので、このページだけで使う。
 */
const TIMETABLE_STATION_FIELDS: TripBlockFields = {
    ...TRIP_BLOCK_TIMELINE_FIELDS,
    time: [...TRIP_BLOCK_TIMELINE_FIELDS['time'], 'pickupType', 'dropoffType'],
};

/**
 * サーバーが描いた分（その駅に停まる列車を持つ運行だけ・時刻は 3 つまで）をブラウザへ渡す。
 * 全量の trip-blocks は HttpTransferCache に積まず（SKIP_TRANSFER_CACHE）、描くのに要る分だけをこの鍵に積む。
 * 条件（ダイヤ・方向・駅）が合わない HTML では使わず捨てる。
 */
type StationPayload = {
    calendarId: string;
    tripDirection: number;
    stationId: string;
    tripBlocks: TripBlockWithTripsDto[];
};

const STATION_PAYLOAD_KEY = makeStateKey<StationPayload>(
    'timetable-station-trips',
);

@Injectable()
export class TimetableStationService {
    readonly #calendarService = inject(CalendarService);
    readonly #tripBlockService = inject(TripBlockService);
    readonly #tripClassService = inject(TripClassService);
    readonly #operationService = inject(OperationService);
    readonly #operationSightingService = inject(OperationSightingService);
    readonly #store = inject(TimetableStationStore);
    readonly #transferState = inject(TransferState);
    readonly #queryInvalidator = inject(QueryInvalidator);
    readonly #isServer = isPlatformServer(inject(PLATFORM_ID));

    /** 今回の `fetchTrips` が、サーバーの削った配列で埋めたか（全量は未取得） */
    #usedTransferredTrips = false;

    /**
     * ダイヤを取ってストアへ入れる。api は無い ID に 404 でなく 200 と空の本文（null）を返すので、
     * 取れたか（無いと分かったら false）を返す。失敗（5xx・通信の失敗）はエラーのまま流す。
     */
    fetchCalendar(): Observable<boolean> {
        const calendarId = this.#store.calendarId();

        // calendar 未選択（初期状態など）では /v3/calendars/null を叩かない。
        if (!calendarId) {
            return of(true);
        }

        return this.#calendarService.findOne({ calendarId }).pipe(
            tap((data: CalendarDetailsDto | null) => {
                this.#store.setCalendar(data);
            }),
            map((data) => data !== null && data !== undefined),
        );
    }

    /**
     * 方向ごとの運行（trip-block）を 1 本で取り、脚注用の運行とその駅に停まる列車の両方をストアへ入れる。
     * 以前は駅ごとに `/v3/trips/station`（横浜・平日・上りで約 1.6MB）も取っていた。運行は方向ごとに
     * キャッシュされるので、駅を切り替えても取り直さない（行の条件と順は `stationTrips`）。
     */
    fetchTrips(): Observable<void> {
        this.#usedTransferredTrips = false;
        const stationId = this.#store.stationId();
        const calendarId = this.#store.calendarId();
        const tripDirection = this.#store.tripDirection();

        // 駅・ダイヤ未選択（初期状態）では取りに行かない。
        if (!stationId || !calendarId || tripDirection === null) {
            return of(undefined);
        }

        if (!this.#isServer && this.#useTransferredTrips()) {
            return of(undefined);
        }

        return this.#tripBlockService
            .findManyByFilter({
                calendarId,
                tripDirection,
                fields: TIMETABLE_STATION_FIELDS,
                // 全量は HTML に積まない。描く分だけを下の鍵に積む
                context: this.#isServer
                    ? skipTransferCacheContext()
                    : undefined,
            })
            .pipe(
                tap((tripBlocks) => {
                    // 取り直しの間に条件が替わったら、古い条件の中身で上書きしない
                    if (
                        calendarId !== this.#store.calendarId() ||
                        stationId !== this.#store.stationId() ||
                        tripDirection !== this.#store.tripDirection()
                    ) {
                        return;
                    }
                    this.#store.setTripBlocks(tripBlocks);
                    this.#store.setTrips(
                        stationTrips(tripBlocks, stationId, tripDirection),
                    );
                    if (this.#isServer) {
                        this.#transferState.set(STATION_PAYLOAD_KEY, {
                            calendarId,
                            tripDirection,
                            stationId,
                            tripBlocks: pruneStationTripBlocks(
                                tripBlocks,
                                stationId,
                                tripDirection,
                            ),
                        });
                    }
                }),
                map(() => undefined),
            );
    }

    /**
     * 今回の描画で、サーバーが積んだ削った配列を使ったか。true の間、ストアの運行は全量でない。
     * 次の `fetchTrips`（取り直し・駅の切り替え）で false に戻る。
     */
    usedTransferredTrips(): boolean {
        return this.#usedTransferredTrips;
    }

    /**
     * ブラウザで、サーバーが積んだ削った配列があれば、HTTP を出さずにストアへ入れる。
     * 鍵は 1 回きりなので、条件が合うかに関わらず必ず消す。
     * 書き込みの後 1 時間（`cache: 'reload'`）と、条件（ダイヤ・方向・駅）が合わない中身では使わない。
     * 削った配列は `QueryCache` に入れない（次に駅を替えたとき欠けた列車が出るため）。
     */
    #useTransferredTrips(): boolean {
        if (!this.#transferState.hasKey(STATION_PAYLOAD_KEY)) return false;
        const payload = this.#transferState.get(STATION_PAYLOAD_KEY, null);
        this.#transferState.remove(STATION_PAYLOAD_KEY);

        if (
            !payload ||
            this.#queryInvalidator.requestCache('timetable') === 'reload' ||
            payload.calendarId !== this.#store.calendarId() ||
            payload.tripDirection !== this.#store.tripDirection() ||
            payload.stationId !== this.#store.stationId()
        ) {
            return false;
        }

        this.#store.setTripBlocks(payload.tripBlocks);
        this.#store.setTrips(
            stationTrips(
                payload.tripBlocks,
                payload.stationId,
                payload.tripDirection,
            ),
        );
        this.#usedTransferredTrips = true;
        return true;
    }

    fetchTripClasses(): Observable<void> {
        return this.#tripClassService.findMany({}).pipe(
            tap((data: TripClassDetailsDto[]) => {
                this.#store.setTripClasses(data);
            }),
            map(() => undefined),
        );
    }

    fetchOperations(): Observable<void> {
        const calendarId = this.#store.calendarId();

        return this.#operationService
            .findManyByCalendarId({ calendarId: calendarId ?? undefined })
            .pipe(
                map((data) => data.filter((o) => o.operationNumber !== '100')),
                tap((data: OperationDetailsDto[]) => {
                    this.#store.setOperations(data);
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
     *
     * 失敗してもエラーにはせず、取れたか（取る運用が無いときも true）を返す。
     * 呼び出し側が、取れなかったときに圏外用の保存を戻すために使う。
     */
    fetchOperationSightingTimeCrossSections(): Observable<boolean> {
        const operationIds = this.#store.operationIds();
        const operations = this.#store
            .operations()
            .filter((o) => operationIds.includes(o.operationId));

        if (operations.length === 0) {
            this.#store.resetOperationSightingTimeCrossSections();
            return of(true);
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
                        this.#store.setOperationSightingTimeCrossSection(
                            operationNumber,
                            crossSection,
                        );
                    }
                }),
                map(() => true),
                catchError(() => of(false)),
            );
    }
}
