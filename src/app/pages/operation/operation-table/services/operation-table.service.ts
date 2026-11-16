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
import { CalendarService } from 'src/app/libs/calendar/usecase/calendar.service';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { StationService } from 'src/app/libs/station/usecase/station.service';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import { OperationTableStore } from '../stores/operation-table.store';
import {
    pruneOperationTrips,
    SERVER_RENDERED_CARDS,
} from '../utils/prune-operation-trips.util';

/**
 * サーバーが描いた分（先頭のカードは全部、5 枚目からは場所取りに要る分だけ）をブラウザへ渡す。
 * 全量の応答は HttpTransferCache に積まず（SKIP_TRANSFER_CACHE）、描くのに要る分だけをこの鍵に積む。
 * ダイヤが合わない HTML では使わず捨てる。
 */
type OperationTablePayload = {
    calendarId: string;
    operationTrips: OperationTripsDto[];
};

const OPERATION_TABLE_PAYLOAD_KEY = makeStateKey<OperationTablePayload>(
    'operation-table-trips',
);

@Injectable()
export class OperationTableService {
    readonly #store = inject(OperationTableStore);
    readonly #calendarService = inject(CalendarService);
    readonly #operationService = inject(OperationService);
    readonly #stationService = inject(StationService);
    readonly #tripClassService = inject(TripClassService);
    readonly #transferState = inject(TransferState);
    readonly #queryInvalidator = inject(QueryInvalidator);
    readonly #isServer = isPlatformServer(inject(PLATFORM_ID));

    /** 今回の `fetchOperationTrips` が、サーバーの削った配列で埋めたか（全量は未取得） */
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
            tap((calendar: CalendarDetailsDto | null) => {
                this.#store.setCalendar(calendar);
            }),
            map((calendar) => calendar !== null && calendar !== undefined),
        );
    }

    /**
     * 今回の描画で、サーバーが積んだ削った配列を使ったか。true の間、ストアの運用は全量でない。
     * 次の `fetchOperationTrips`（全量の取り直し）で false に戻る。
     */
    usedTransferredTrips(): boolean {
        return this.#usedTransferredTrips;
    }

    fetchOperationTrips(): Observable<void> {
        this.#usedTransferredTrips = false;
        const calendarId = this.#store.calendarId();

        // calendar 未選択では /v3/operations/calendar/null/trips を叩かない。
        if (!calendarId) {
            return of(undefined);
        }

        if (!this.#isServer && this.#useTransferredTrips(calendarId)) {
            return of(undefined);
        }

        // ダイヤ内の全運用を列車つきで 1 回で取る。以前は運用の一覧を取ってから
        // 運用ごとに /operations/:id/trips を呼び、1 画面で 104 本のリクエストが飛んでいた
        return this.#operationService
            .findManyWithTrips({
                calendarId,
                // 全量は HTML に積まない。描く分だけを下で鍵に積む
                context: this.#isServer
                    ? skipTransferCacheContext()
                    : undefined,
            })
            .pipe(
                map((operationTrips) =>
                    operationTrips.filter(
                        ({ operation }) => operation.operationNumber !== '100',
                    ),
                ),
                tap((operationTrips) => {
                    // 取り直しの間にダイヤが替わったら、古いダイヤの中身で上書きしない
                    if (calendarId !== this.#store.calendarId()) return;
                    this.#store.setOperationTrips(operationTrips);
                    if (this.#isServer) {
                        this.#transferState.set(OPERATION_TABLE_PAYLOAD_KEY, {
                            calendarId,
                            operationTrips: pruneOperationTrips(
                                this.#store.sortedOperationTrips(),
                                SERVER_RENDERED_CARDS,
                            ),
                        });
                    }
                }),
                map(() => undefined),
            );
    }

    /**
     * ブラウザで、サーバーが積んだ削った配列があれば、HTTP を出さずにストアへ入れる。
     * 鍵は 1 回きりなので、条件が合うかに関わらず必ず消す。
     * 書き込みの後 1 時間（`cache: 'reload'`）と、ダイヤが合わない中身では使わない。
     * 削った配列は `QueryCache` に入れない。
     */
    #useTransferredTrips(calendarId: string): boolean {
        if (!this.#transferState.hasKey(OPERATION_TABLE_PAYLOAD_KEY)) {
            return false;
        }
        const payload = this.#transferState.get(
            OPERATION_TABLE_PAYLOAD_KEY,
            null,
        );
        this.#transferState.remove(OPERATION_TABLE_PAYLOAD_KEY);

        if (
            !payload ||
            this.#queryInvalidator.requestCache('timetable') === 'reload' ||
            payload.calendarId !== calendarId
        ) {
            return false;
        }

        this.#store.setPartialOperationTrips(payload.operationTrips);
        this.#usedTransferredTrips = true;
        return true;
    }

    fetchItineraryLinks(): Observable<void> {
        const calendarId = this.#store.calendarId();

        if (!calendarId) {
            return of(undefined);
        }

        return this.#operationService
            .findManyItineraryLinks({ calendarId })
            .pipe(
                tap((links) => {
                    this.#store.setItineraryLinks(links);
                }),
                map(() => undefined),
            );
    }

    fetchStations(): Observable<void> {
        return this.#stationService.findMany({}).pipe(
            tap((stations: StationDetailsDto[]) => {
                this.#store.setStations(stations);
            }),
            map(() => undefined),
        );
    }

    fetchTripClasses(): Observable<void> {
        return this.#tripClassService.findMany({}).pipe(
            tap((tripClasses: TripClassDetailsDto[]) => {
                this.#store.setTripClasses(tripClasses);
            }),
            map(() => undefined),
        );
    }
}
