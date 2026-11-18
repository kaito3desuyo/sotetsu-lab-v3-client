import { toServiceSeconds } from 'src/app/core/utils/railway-day';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import { toZeroBasedDays } from '../../timetable-formation/utils/formation-display.util';
import { FormationRowProgress } from '../../timetable-formation/utils/formation-progress.util';
import { OperationViewKind } from '../stores/timetable-operation.store';
import { OperationDayRow } from './operation-day.util';

export interface OperationProgress {
    /** rows と同じ並び */
    states: FormationRowProgress[];
    /** 走っている列車の行の添字。無ければ -1 */
    runningIndex: number;
}

const seconds = (
    days: number | null | undefined,
    time: string | null | undefined,
): number => toServiceSeconds(toZeroBasedDays(days), time ?? undefined);

const startSec = (t: TripOperationListDetailsDto): number => {
    const s = t.startTime;
    const v = seconds(s?.departureDays, s?.departureTime);
    return Number.isNaN(v) ? seconds(s?.arrivalDays, s?.arrivalTime) : v;
};

const endSec = (t: TripOperationListDetailsDto): number => {
    const e = t.endTime;
    const v = seconds(e?.arrivalDays, e?.arrivalTime);
    return Number.isNaN(v) ? seconds(e?.departureDays, e?.departureTime) : v;
};

/**
 * 行ごとの過ぎた・走っている・これからを決める（編成別時刻表の computeProgress と同じ決まり）。
 * 過去の日はどれも過ぎた、ダイヤの形はどれもこれから（薄くしない）。今日は baseDate の日本時間 0 時からの秒数で比べる。
 * 列車でない行（入出庫・差し替わり）は次の列車に合わせる（後ろに列車が無ければ前の列車）。
 */
export function computeOperationProgress(
    rows: OperationDayRow[],
    baseDate: string | null,
    viewKind: OperationViewKind,
    now: Date,
): OperationProgress {
    const nowSec = baseDate
        ? (now.getTime() - Date.parse(`${baseDate}T00:00:00+09:00`)) / 1000
        : NaN;
    const states: (FormationRowProgress | null)[] = rows.map((r) => {
        if (r.kind !== 'trip') return null;
        if (viewKind === 'past') return 'past';
        if (viewKind === 'calendar' || Number.isNaN(nowSec)) return 'future';
        if (startSec(r.trip) <= nowSec && nowSec < endSec(r.trip)) {
            return 'running';
        }
        return endSec(r.trip) <= nowSec ? 'past' : 'future';
    });
    const filled = states.map((state, i): FormationRowProgress => {
        if (state) return state;
        const next = states.slice(i + 1).find((s) => s !== null);
        if (next) return next;
        const prev = states
            .slice(0, i)
            .reverse()
            .find((s) => s !== null);
        return prev ?? 'future';
    });
    return { states: filled, runningIndex: states.indexOf('running') };
}
