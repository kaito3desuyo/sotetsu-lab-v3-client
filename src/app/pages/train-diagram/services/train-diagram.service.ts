import { inject, Injectable } from '@angular/core';
import { lastValueFrom, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ServiceListState } from 'src/app/global-states/service-list.state';
import { CalendarService } from 'src/app/libs/calendar/usecase/calendar.service';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { ServiceService } from 'src/app/libs/service/usecase/service.service';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import { TRIP_BLOCK_TIMELINE_FIELDS } from 'src/app/libs/trip-block/usecase/trip-block-fields';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import { attachTripClasses } from 'src/app/shared/attach-trip-classes.util';
import { TrainDiagramStore } from '../stores/train-diagram.store';

export interface TrainDiagramFetchFlags {
    /** 列車を取り直すか（ダイヤが変わった・初回・骨組みのまま） */
    refetchTripBlocks: boolean;
    /** この訪問での初回の取得か（種別と路線網の駅を取る） */
    firstLoad: boolean;
    /** 取得がすべて成功したあと（骨組みを消す前）に呼ぶ */
    onLoaded: () => void;
    /** 取得を始めたダイヤが無いと分かったとき（古い取得の結果では呼ばない） */
    onCalendarMissing: () => void;
}

@Injectable()
export class TrainDiagramService {
    readonly #store = inject(TrainDiagramStore);
    readonly #serviceService = inject(ServiceService);
    readonly #serviceListState = inject(ServiceListState);
    readonly #tripClassService = inject(TripClassService);
    readonly #tripBlockService = inject(TripBlockService);
    readonly #calendarService = inject(CalendarService);
    readonly #operationService = inject(OperationService);
    readonly #operationSightingService = inject(OperationSightingService);

    fetchTripClasses(): Observable<void> {
        return this.#tripClassService.findMany({}).pipe(
            tap((data) => {
                this.#store.setTripClasses(data);
            }),
            map(() => undefined),
        );
    }

    /**
     * ダイヤがあるかを確かめる（URL の calendar_id が実在するか）。api は無い ID に 404 でなく
     * 200 と空の本文（null）を返すので、無いと分かったら false を返す。失敗（5xx・通信の失敗）はエラーのまま流す。
     */
    fetchCalendar(): Observable<boolean> {
        const calendarId = this.#store.calendarId();

        if (!calendarId) {
            return of(true);
        }

        return this.#calendarService
            .findOne({ calendarId })
            .pipe(
                map((calendar) => calendar !== null && calendar !== undefined),
            );
    }

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
     * 車両の前後の運用（運用表・行路図と同じ口）を取る。
     * 入出庫の端を □ で描くためだけに使うので、取れなくても空として扱い（今の △○ のまま）、図は止めない。
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

    /**
     * 網羅駅（全線時刻表と同一の並び順）を取得する。
     * 単一路線ではなくサービス全体の駅を取得するため、serviceId は変わらず
     * ダイヤ・路線絞り込みが変わっても再取得は不要（初回のみ呼び出せばよい）。
     * 駅軸（stationAxis）自体は store 側で選択路線・取得済み tripBlocks から導出される。
     */
    fetchNetworkStations(): Observable<void> {
        const serviceId = this.#serviceListState.serviceId();

        return this.#serviceService.findOneWithStations({ serviceId }).pipe(
            tap((data) => {
                this.#store.setNetworkStations(data.stations);
            }),
            map(() => undefined),
        );
    }

    /**
     * タップで選択された列車の充当編成（目撃クロスセクション由来）を取得する。
     * 今日有効なダイヤ表示時のみ呼び出し側（コンポーネント）が呼ぶ。
     */
    fetchOperationSightingTimeCrossSection(
        operationNumber: string,
    ): Observable<void> {
        return this.#operationSightingService
            .findOneTimeCrossSectionByOperationNumber({ operationNumber })
            .pipe(
                tap((data) => {
                    if (!data) {
                        return;
                    }
                    this.#store.setOperationSightingTimeCrossSection(
                        operationNumber,
                        data,
                    );
                }),
                map(() => undefined),
            );
    }

    /**
     * 列車・ダイヤ・路線網の駅を順に取り、ストアへ入れる。失敗したら圏外用に保存した中身を戻す。
     * 初回かどうか（firstLoad）と、取れたあと・ダイヤが無いと分かったときの後始末は、
     * 訪問ごとの状態を持つ component が渡す。
     */
    async fetchData(flags: TrainDiagramFetchFlags): Promise<void> {
        // 路線・方向だけの取得は世代を進めず、骨組みにも触らない（図を出したまま）
        const seq = flags.refetchTripBlocks
            ? this.#store.nextFetchSeq()
            : this.#store.currentFetchSeq();
        const conditions = {
            calendarId: this.#store.calendarId(),
            routeIds: [...this.#store.selectedRouteIds()].sort().join(','),
        };
        this.#store.enableLoading();
        if (flags.refetchTripBlocks) {
            this.#store.setHasFetchedTrainDiagram(false);
        }

        // フェッチ失敗（reject）時にも loadingQueue を必ず戻す
        // （finally が無いと isLoading が true のまま回復不能になる）
        try {
            // 運行は種別を貼り付けるので種別の後。路線網の駅はどちらにも依存しないので並行に取る
            const firstLoad = flags.firstLoad;
            let hasFetchedItineraryLinks = true;
            // api は無いダイヤに 404 でなく 200 と空の本文（null）を返す。取れて「無い」と分かったときだけ true
            let calendarMissing = false;
            const fetchTripBlocks = async (): Promise<void> => {
                if (firstLoad) {
                    await lastValueFrom(this.fetchTripClasses());
                }
                if (flags.refetchTripBlocks) {
                    // 失敗を決める前に両方の終わりを待つ（遅れて届いた成功が、戻した中身を上書きしないように）
                    const results = await Promise.allSettled([
                        lastValueFrom(this.fetchTripBlocks()),
                        // □ の判定用。取れなくても空として扱うので図は止めない
                        lastValueFrom(this.fetchItineraryLinks()),
                        // ダイヤの存在の確認。失敗は図の失敗にせず、無いと分かったときだけ使う
                        lastValueFrom(this.fetchCalendar()),
                    ]);
                    const calendarResult = results[2];
                    calendarMissing =
                        calendarResult.status === 'fulfilled' &&
                        calendarResult.value === false;
                    const rejected = results
                        .slice(0, 2)
                        .find(
                            (result): result is PromiseRejectedResult =>
                                result.status === 'rejected',
                        );
                    if (rejected) {
                        throw rejected.reason;
                    }
                    // 前後の運用が取れなかった中身は、圏外用に保存しない（良い保存を空のつながりで上書きしない）
                    const linksResult = results[1];
                    hasFetchedItineraryLinks = !(
                        linksResult.status === 'fulfilled' &&
                        linksResult.value?.failed
                    );
                    // 古い取得の結果で、新しい取得の知らせを消したり出したりしない
                    if (this.#store.isLatestFetch(seq)) {
                        this.#store.setPartialFailure(
                            !hasFetchedItineraryLinks,
                        );
                    }
                }
            };
            const results = await Promise.allSettled([
                fetchTripBlocks(),
                firstLoad
                    ? lastValueFrom(this.fetchNetworkStations())
                    : undefined,
            ]);
            const failure = results.find(
                (result): result is PromiseRejectedResult =>
                    result.status === 'rejected',
            );
            if (failure) {
                // 通信できないときは、同じ条件で保存した中身を出す。列車を取り直す取得だけが対象で、
                // 古い取得の失敗では戻さない。戻す処理が壊れていても、取得の失敗をそのまま投げる
                // （読み込み中は finally で解く）。戻したときは初回扱いのまま（次に通信できたら取り直す）
                if (flags.refetchTripBlocks && this.#store.isLatestFetch(seq)) {
                    try {
                        await this.#store.restoreOfflineSnapshot(
                            'main',
                            conditions,
                        );
                    } catch {
                        // 保存した中身が壊れていても、取得の失敗を優先する
                    }
                }
                throw failure.reason;
            }
            // 取得がすべて成功した中身を、次に圏外のときのために保存する
            if (
                flags.refetchTripBlocks &&
                !calendarMissing &&
                hasFetchedItineraryLinks &&
                this.#store.isLatestFetch(seq)
            ) {
                void this.#store.saveOfflineSnapshot('main', conditions);
            }
            flags.onLoaded();
            // 取得を始めたときのダイヤで決める。古い取得の結果では見つからない表示にしない
            if (calendarMissing && this.#store.isLatestFetch(seq)) {
                flags.onCalendarMissing();
            }
        } finally {
            this.#store.disableLoading();
            // 列車を取り直した取得のうち、いちばん新しいものだけが骨組みを消す
            if (flags.refetchTripBlocks && this.#store.isLatestFetch(seq)) {
                this.#store.setHasFetchedTrainDiagram(true);
            }
        }
    }
}
