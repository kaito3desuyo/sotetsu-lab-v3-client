import { toServiceSeconds } from 'src/app/core/utils/railway-day';
import { toZeroBasedDays } from './formation-display.util';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import { FormationDateKind } from '../stores/timetable-formation.store';
import { FormationDayRow } from './formation-day.util';

/** 行の進み具合。past は過ぎた（薄く出す）、running は走っている（色を付ける） */
export type FormationRowProgress = 'past' | 'running' | 'future';

export interface FormationProgress {
    /** rows と同じ並び */
    states: FormationRowProgress[];
    /** 走っている列車の行の添字。無ければ -1 */
    runningIndex: number;
    /** いまの運用を決める列車の行の添字（走っている列車 → 次の列車 → 最後の列車の順） */
    currentIndex: number;
}

const startSec = (t: TripOperationListDetailsDto): number => {
    const s = t.startTime;
    const v = toServiceSeconds(
        toZeroBasedDays(s?.departureDays),
        s?.departureTime,
    );
    return Number.isNaN(v)
        ? toServiceSeconds(toZeroBasedDays(s?.arrivalDays), s?.arrivalTime)
        : v;
};

const endSec = (t: TripOperationListDetailsDto): number => {
    const e = t.endTime;
    const v = toServiceSeconds(toZeroBasedDays(e?.arrivalDays), e?.arrivalTime);
    return Number.isNaN(v)
        ? toServiceSeconds(toZeroBasedDays(e?.departureDays), e?.departureTime)
        : v;
};

/**
 * 行ごとの過ぎた・走っている・これからを決める。
 * 過去の日はどれも過ぎた、明日はどれもこれから。今日は baseDate の日本時間 0 時からの秒数で比べる。
 * 推定の列車は走っているとは見なさず、過ぎたものとして出す（設計書「いまの位置」）。
 * 列車でない行（入出庫・乗り移り・目撃の帯）は、次の列車の進み具合に合わせる（入庫は前の列車）。
 */
export function computeProgress(
    rows: FormationDayRow[],
    baseDate: string,
    dateKind: FormationDateKind,
    now: Date,
): FormationProgress {
    const nowSec =
        (now.getTime() - Date.parse(`${baseDate}T00:00:00+09:00`)) / 1000;
    const states: (FormationRowProgress | null)[] = rows.map((r) => {
        if (r.kind !== 'trip') return null;
        if (dateKind === 'past') return 'past';
        if (dateKind === 'tomorrow') return 'future';
        if (r.estimated) return 'past';
        if (startSec(r.trip) <= nowSec && nowSec < endSec(r.trip)) {
            return 'running';
        }
        return endSec(r.trip) <= nowSec ? 'past' : 'future';
    });

    const filled = states.map((state, i): FormationRowProgress => {
        if (state) return state;
        const nextTrip = states.slice(i + 1).find((s) => s !== null);
        if (nextTrip) return nextTrip;
        const prevTrip = states
            .slice(0, i)
            .reverse()
            .find((s) => s !== null);
        return prevTrip ?? 'future';
    });

    const runningIndex = states.indexOf('running');
    const lastTrip = states.reduce((acc, s, i) => (s !== null ? i : acc), -1);
    const upcoming = states.findIndex((s) => s === 'future');
    let currentIndex = runningIndex;
    if (currentIndex < 0) {
        currentIndex = dateKind === 'past' ? lastTrip : upcoming;
    }
    if (currentIndex < 0) currentIndex = lastTrip;
    return {
        states: filled,
        runningIndex,
        currentIndex: Math.max(0, currentIndex),
    };
}
