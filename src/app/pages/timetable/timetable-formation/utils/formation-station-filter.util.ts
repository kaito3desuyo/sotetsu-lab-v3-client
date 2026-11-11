import { toServiceSeconds } from 'src/app/core/utils/railway-day';
import { toZeroBasedDays } from './formation-display.util';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import { FormationDayRow } from './formation-day.util';

export interface FormationStationVisit {
    trip: TripOperationListDetailsDto;
    time: TimeDetailsDto;
    /** pickupType 1 かつ dropoffType 1、時刻が null */
    passing: boolean;
    /** now より前か。通過は前後の停車駅の時刻で決める */
    done: boolean;
}

export interface FormationStationSummary {
    visits: FormationStationVisit[];
    total: number;
    stops: number;
    passes: number;
    done: number;
    remaining: number;
}

const arrivalSeconds = (t: TimeDetailsDto): number => {
    const v = toServiceSeconds(toZeroBasedDays(t.arrivalDays), t.arrivalTime);
    return Number.isNaN(v)
        ? toServiceSeconds(toZeroBasedDays(t.departureDays), t.departureTime)
        : v;
};

const departureSeconds = (t: TimeDetailsDto): number => {
    const v = toServiceSeconds(
        toZeroBasedDays(t.departureDays),
        t.departureTime,
    );
    return Number.isNaN(v)
        ? toServiceSeconds(toZeroBasedDays(t.arrivalDays), t.arrivalTime)
        : v;
};

export const isPassing = (t: TimeDetailsDto): boolean =>
    t.pickupType === 1 &&
    t.dropoffType === 1 &&
    !t.arrivalTime &&
    !t.departureTime;

/** 時刻の分かる停車駅（通過でない駅）か */
const hasTime = (t: TimeDetailsDto): boolean =>
    !Number.isNaN(arrivalSeconds(t));

/**
 * 編成の 1 日の行から、ある駅に来る列車を拾って回数を数える。
 * 時刻は baseDate（営業日 'yyyy-MM-dd'）の日本時間 0 時からの秒数で比べる。
 * now が null（過去の日）なら全部 done。unknown の行より後の列車は数えない。
 */
export function filterByStation(
    rows: FormationDayRow[],
    stationId: string,
    baseDate: string,
    now: Date | null,
): FormationStationSummary {
    const nowSec =
        now === null
            ? null
            : (now.getTime() - Date.parse(`${baseDate}T00:00:00+09:00`)) / 1000;

    const visits: FormationStationVisit[] = [];
    for (const r of rows) {
        if (r.kind === 'unknown') break;
        if (r.kind !== 'trip') continue;
        const times = [...(r.trip.trip?.times ?? [])].sort(
            (a, b) => (a.stopSequence ?? 0) - (b.stopSequence ?? 0),
        );
        times.forEach((time, i) => {
            if (time.stationId !== stationId) return;
            const passing = isPassing(time);
            visits.push({
                trip: r.trip,
                time,
                passing,
                done: isDone(times, i, passing, nowSec),
            });
        });
    }

    const passes = visits.filter((v) => v.passing).length;
    const done = visits.filter((v) => v.done).length;
    return {
        visits,
        total: visits.length,
        stops: visits.length - passes,
        passes,
        done,
        remaining: visits.length - done,
    };
}

function isDone(
    times: TimeDetailsDto[],
    index: number,
    passing: boolean,
    nowSec: number | null,
): boolean {
    if (nowSec === null) return true;
    const time = times[index];
    if (!passing) {
        const sec = departureSeconds(time);
        return !Number.isNaN(sec) && sec < nowSec;
    }
    // 通過: 次の停車駅に着いていれば済み。次が無ければ前の停車駅の発車で決める
    const next = times.slice(index + 1).find(hasTime);
    if (next) return arrivalSeconds(next) < nowSec;
    const prev = times.slice(0, index).reverse().find(hasTime);
    return prev ? departureSeconds(prev) < nowSec : false;
}
