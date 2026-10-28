import { computed } from '@angular/core';
import {
    patchState,
    signalStore,
    withComputed,
    withFeature,
    withHooks,
    withMethods,
    withState,
} from '@ngrx/signals';
import {
    addDays,
    format,
    getHours,
    parse,
    parseISO,
    setHours,
    setMilliseconds,
    setMinutes,
    setSeconds,
    subDays,
} from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { flow, groupBy, isString } from 'es-toolkit';
import { withAppDevtools } from 'src/app/core/store-features/with-app-devtools';
import { withOfflineSnapshots } from 'src/app/core/store-features/with-offline-snapshots';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';

type OperationSightingsGroupedByDate = {
    [formationId: string]: {
        [date: string]: OperationSightingDetailsDto[];
    };
};

type StoreProps = {
    referenceDate: string;
    days: number;
    includeInvalidated: boolean;
    calendars: { date: string; calendar: CalendarDetailsDto }[];
    operations: OperationDetailsDto[];
    formations: FormationDetailsDto[];
    operationSightings: OperationSightingDetailsDto[];
    selectedAgencyIds: string[];
    loadingQueue: boolean[];
    hasFetchedPastTime: boolean;
};

/**
 * 圏外のために端末に保存する中身。条件（referenceDate・days・includeInvalidated）と
 * 画面の設定（選択中の会社）は入れない。
 */
export type OperationPastTimeSnapshot = Pick<
    StoreProps,
    'calendars' | 'operations' | 'formations' | 'operationSightings'
>;

const initialState: StoreProps = {
    referenceDate: null,
    days: null,
    includeInvalidated: false,
    calendars: [],
    operations: [],
    formations: [],
    operationSightings: [],
    selectedAgencyIds: [],
    loadingQueue: [],
    hasFetchedPastTime: false,
};

/** 基準日**から**先へ N 日間を返す（v2 以来の仕様。ユーザー確認 2026-09-24）。 */
export function generateDates(referenceDate: string, days: number): string[] {
    if (!referenceDate || !days) return [];

    const initializeTime = flow(
        (date: Date) => setHours(date, 4),
        (date: Date) => setMinutes(date, 0),
        (date: Date) => setSeconds(date, 0),
        (date: Date) => setMilliseconds(date, 0),
    );

    const dates: string[] = [];
    const base = initializeTime(parse(referenceDate, 'yyyy-MM-dd', new Date()));

    for (let i = 0; i < days; i++) {
        dates.push(format(addDays(base, i), 'yyyy-MM-dd'));
    }

    return dates;
}

function groupSightingsByFormationAndDate(
    sightings: OperationSightingDetailsDto[],
): OperationSightingsGroupedByDate {
    return flow(
        (list: OperationSightingDetailsDto[]) =>
            groupBy(list, (o) => o.formationId),
        (grouped) => Object.entries(grouped),
        (entries) =>
            entries.map(([formationId, sightingsOfFormation]) => [
                formationId,
                groupBy(sightingsOfFormation, (o) => {
                    const date = toZonedTime(
                        parseISO(o.sightingTime),
                        'Asia/Tokyo',
                    );
                    const adjustedDate =
                        getHours(date) < 4 ? subDays(date, 1) : date;
                    return format(adjustedDate, 'yyyy-MM-dd');
                }),
            ]),
        (arr): OperationSightingsGroupedByDate =>
            arr.reduce((base, [formationId, sightingsOfDate]) => {
                if (!isString(formationId)) {
                    return { ...base };
                }
                return { ...base, [formationId]: sightingsOfDate };
            }, {}),
    )(sightings);
}

export const OperationPastTimeStore = signalStore(
    { providedIn: 'root' },
    withState<StoreProps>(initialState),
    withComputed(
        ({ referenceDate, days, operationSightings, loadingQueue }) => ({
            isLoading: computed(() => loadingQueue().length > 0),
            /** 目撃を編成と運行日で分けたもの（state の operationSightings は取得した一覧のまま） */
            operationSightingsGroupedByDate: computed(() =>
                groupSightingsByFormationAndDate(operationSightings()),
            ),
            dates: computed(() => generateDates(referenceDate(), days())),
        }),
    ),
    withMethods((store) => {
        // 取得の世代番号。ページを離れてすぐ戻ったとき、前のインスタンスの取得が
        // 後から終わって新しい骨組みを消さないよう、コンポーネントでなくストアで数える
        let fetchSeq = 0;

        return {
            nextFetchSeq(): number {
                return ++fetchSeq;
            },
            isLatestFetch(seq: number): boolean {
                return seq === fetchSeq;
            },
            setReferenceDate(referenceDate: string): void {
                patchState(store, { referenceDate });
            },
            setDays(days: number): void {
                patchState(store, { days });
            },
            setIncludeInvalidated(includeInvalidated: boolean): void {
                patchState(store, { includeInvalidated });
            },
            setCalendars(
                calendars: { date: string; calendar: CalendarDetailsDto }[],
            ): void {
                patchState(store, { calendars });
            },
            setOperations(operations: OperationDetailsDto[]): void {
                patchState(store, { operations });
            },
            setFormations(formations: FormationDetailsDto[]): void {
                patchState(store, { formations });
            },
            setOperationSightings(
                operationSightings: OperationSightingDetailsDto[],
            ): void {
                patchState(store, { operationSightings });
            },
            setSelectedAgencyIds(agencyIds: string[]): void {
                patchState(store, { selectedAgencyIds: agencyIds });
            },
            enableLoading(): void {
                patchState(store, (state) => ({
                    loadingQueue: state.loadingQueue.concat(true),
                }));
            },
            disableLoading(): void {
                patchState(store, (state) => ({
                    loadingQueue: state.loadingQueue.slice(1),
                }));
            },
            resetLoading(): void {
                patchState(store, { loadingQueue: [] });
            },
            /** いまの条件の取得が終わったか（失敗しても true）。取る前は表の代わりに骨組みを出す */
            setHasFetchedPastTime(value: boolean): void {
                patchState(store, { hasFetchedPastTime: value });
            },
            /** 圏外のために保存する中身を取り出す */
            snapshot(): OperationPastTimeSnapshot {
                return {
                    calendars: store.calendars(),
                    operations: store.operations(),
                    formations: store.formations(),
                    operationSightings: store.operationSightings(),
                };
            },
            /** 保存した中身を戻す（条件の referenceDate・days・includeInvalidated は今のまま） */
            restoreSnapshot(data: OperationPastTimeSnapshot): void {
                patchState(store, {
                    calendars: data.calendars,
                    operations: data.operations,
                    formations: data.formations,
                    operationSightings: data.operationSightings,
                });
            },
        };
    }),
    withFeature((store) =>
        withOfflineSnapshots({
            main: {
                key: 'OperationPastTime',
                select: () => store.snapshot(),
                apply: (data: OperationPastTimeSnapshot) =>
                    store.restoreSnapshot(data),
            },
        }),
    ),
    withAppDevtools('OperationPastTimeStore'),
    withHooks({
        onInit(store) {
            // 旧版のファイル先頭の resetLoading() を引き継いだもの。fields 以外は戻さないので、今は空の loadingQueue を空にするだけ
            store.resetLoading();
        },
    }),
);
