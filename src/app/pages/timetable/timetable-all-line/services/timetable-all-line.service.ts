import { isPlatformServer } from '@angular/common';
import {
    inject,
    Injectable,
    makeStateKey,
    PLATFORM_ID,
    TransferState,
} from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { QueryInvalidator } from 'src/app/core/query-cache/query-invalidator';
import { skipTransferCacheContext } from 'src/app/core/ssr/skip-transfer-cache';
import { ServiceListState } from 'src/app/global-states/service-list.state';
import { ServiceService } from 'src/app/libs/service/usecase/service.service';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripBlockFields } from 'src/app/libs/trip-block/usecase/trip-block-fields';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import { TimetableAllLineStore } from '../stores/timetable-all-line.store';
import { pruneAllLineTripBlocks } from '../utils/prune-all-line-trip-blocks.util';

/**
 * サーバーが描いた 1 ページ目の分（並べた順の先頭の運行だけ）をブラウザへ渡す。
 * 全量の trip-blocks は HttpTransferCache に積まず（SKIP_TRANSFER_CACHE）、描くのに要る分だけをこの鍵に積む。
 * `listedCount` は、ページ送りに出す絞り込み後の全体の本数。
 * 条件（ダイヤ・方向・ページ送り・路線の絞り込み）が合わない HTML では使わず捨てる。
 */
type AllLinePayload = {
    calendarId: string;
    tripDirection: number;
    pageSize: number;
    listedCount: number;
    tripBlocks: TripBlockDetailsDto[];
};

const ALL_LINE_PAYLOAD_KEY = makeStateKey<AllLinePayload>(
    'timetable-all-line-trips',
);

/**
 * 全線時刻表が読む項目の組。表（時刻・着発・種別・運用番号・始発/終着）と並べ替え、
 * 編集・コピーの遷移（calendarId・tripBlockId）に要るものだけを取る。
 */
const TIMETABLE_ALL_LINE_FIELDS: TripBlockFields = {
    trip: [
        'tripNumber',
        'tripDirection',
        'tripBlockId',
        'tripClassId',
        'calendarId',
    ],
    time: [
        'stationId',
        'stopSequence',
        'arrivalDays',
        'arrivalTime',
        'departureDays',
        'departureTime',
        'pickupType',
        'dropoffType',
    ],
    tripOperationList: ['operationId'],
    operation: ['operationNumber'],
    tripClass: ['tripClassName', 'tripClassColor'],
};

@Injectable()
export class TimetableAllLineService {
    readonly #serviceService = inject(ServiceService);
    readonly #tripBlockService = inject(TripBlockService);
    readonly #serviceListState = inject(ServiceListState);
    readonly #store = inject(TimetableAllLineStore);
    readonly #transferState = inject(TransferState);
    readonly #queryInvalidator = inject(QueryInvalidator);
    readonly #isServer = isPlatformServer(inject(PLATFORM_ID));

    /** 今回の `fetchTripBlocks` が、サーバーの削った配列で埋めたか（全量は未取得） */
    #usedTransferredTrips = false;

    fetchStations(): Observable<void> {
        const serviceId = this.#serviceListState.serviceId();
        return this.#serviceService.findOneWithStations({ serviceId }).pipe(
            tap((data) => {
                this.#store.setStations(data.stations);
            }),
            map(() => undefined),
        );
    }

    fetchTripBlocks(): Observable<void> {
        this.#usedTransferredTrips = false;
        const calendarId = this.#store.calendarId();
        const tripDirection = this.#store.tripDirection();
        const tripBlockId = this.#store.tripBlockId();

        if (!tripBlockId && !this.#isServer && this.#useTransferredTrips()) {
            return of(undefined);
        }

        const tripBlocks$ = tripBlockId
            ? this.#tripBlockService
                  .findOneById({ id: tripBlockId })
                  // api は無い ID に 404 でなく 200 と空の本文（null）を返す。空の配列にして呼び出し側が「無い」と分かるようにする
                  .pipe(map((tb) => (tb ? [tb] : [])))
            : this.#tripBlockService.findManyByFilter({
                  calendarId,
                  tripDirection,
                  fields: TIMETABLE_ALL_LINE_FIELDS,
                  // 全量は HTML に積まない。1 ページ目の分だけを publishFirstPage が鍵に積む
                  context: this.#isServer
                      ? skipTransferCacheContext()
                      : undefined,
              });

        return tripBlocks$.pipe(
            tap((data: TripBlockDetailsDto[]) => {
                // 取り直しの間に条件が替わったら、古い条件の中身で上書きしない
                if (
                    calendarId !== this.#store.calendarId() ||
                    tripDirection !== this.#store.tripDirection() ||
                    tripBlockId !== this.#store.tripBlockId()
                ) {
                    return;
                }
                this.#store.setTripBlocks(data);
            }),
            map(() => undefined),
        );
    }

    /**
     * 今回の描画で、サーバーが積んだ削った配列を使ったか。true の間、ストアの運行は全量でない。
     * 次の `fetchTripBlocks`（全量の取得・削除などの後の取り直し）で false に戻る。
     */
    usedTransferredTrips(): boolean {
        return this.#usedTransferredTrips;
    }

    /**
     * サーバーで、いま描いている 1 ページ目の分だけに削った運行を鍵に積む。
     * 路線の絞り込みの初期化が済んだあとに呼ぶ（絞り込みで隠れる列車を数えないため）。
     * 運行を 1 本指した表示（trip_block_id）では積まない。
     */
    publishFirstPage(): void {
        const calendarId = this.#store.calendarId();
        const tripDirection = this.#store.tripDirection();
        const { pageIndex, pageSize } = this.#store.pageSettings();
        if (
            !this.#isServer ||
            !calendarId ||
            tripDirection === null ||
            this.#store.tripBlockId() ||
            pageIndex !== 0
        ) {
            return;
        }

        const listed = this.#store.listedTrips();
        const listedIds = new Set(listed.map((trip) => trip.tripId));
        this.#transferState.set(ALL_LINE_PAYLOAD_KEY, {
            calendarId,
            tripDirection,
            pageSize,
            listedCount: listed.length,
            tripBlocks: pruneAllLineTripBlocks(
                this.#store.sortedBlocks(),
                pageSize,
                (trip) => listedIds.has(trip.tripId),
            ),
        });
    }

    /**
     * ブラウザで、サーバーが積んだ削った配列があれば、HTTP を出さずにストアへ入れる。
     * 鍵は 1 回きりなので、条件が合うかに関わらず必ず消す。
     * 書き込みの後 1 時間（`cache: 'reload'`）と、条件（ダイヤ・方向・ページ送り・路線の絞り込み）が
     * 合わない中身では使わない。削った配列は `QueryCache` に入れない。
     */
    #useTransferredTrips(): boolean {
        if (!this.#transferState.hasKey(ALL_LINE_PAYLOAD_KEY)) return false;
        const payload = this.#transferState.get(ALL_LINE_PAYLOAD_KEY, null);
        this.#transferState.remove(ALL_LINE_PAYLOAD_KEY);

        const { pageIndex, pageSize } = this.#store.pageSettings();
        if (
            !payload ||
            this.#queryInvalidator.requestCache('timetable') === 'reload' ||
            payload.calendarId !== this.#store.calendarId() ||
            payload.tripDirection !== this.#store.tripDirection() ||
            payload.pageSize !== pageSize ||
            pageIndex !== 0 ||
            this.#store.selectedRouteIds().length > 0
        ) {
            return false;
        }

        this.#store.setPartialTripBlocks({
            tripBlocks: payload.tripBlocks,
            pageSize: payload.pageSize,
            listedCount: payload.listedCount,
        });
        this.#usedTransferredTrips = true;
        return true;
    }

    addTripToTripBlock(params: {
        tripBlockId: string;
        tripId: string;
    }): Observable<void> {
        return this.#tripBlockService
            .addTripToTripBlock(params.tripBlockId, { tripId: params.tripId })
            .pipe(map(() => undefined));
    }

    deleteTripFromTripBlock(params: {
        tripBlockId: string;
        tripId: string;
        holdAsAnotherTripBlock?: boolean;
    }): Observable<void> {
        return this.#tripBlockService
            .deleteTripFromTripBlock(params.tripBlockId, {
                tripId: params.tripId,
                holdAsAnotherTripBlock: params.holdAsAnotherTripBlock ?? false,
            })
            .pipe(map(() => undefined));
    }
}
