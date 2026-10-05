import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import {
    resolveArrival,
    resolveDeparture,
} from './build-trip-diagram-line.util';

/** 所要分の集計にだけ使う固定の日付（差しか使わないため実値は関係しない）。 */
const EPOCH = new Date(2000, 0, 1);

const DAY_MS = 24 * 60 * 60 * 1000;

/** 隣り合う 2 駅の組のキー（向きを区別する）。 */
export function runKey(fromStationId: string, toStationId: string): string {
    return `${fromStationId}>${toStationId}`;
}

function median(values: readonly number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 1
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * 隣り合う 2 駅の標準の運転時間（分）。times の中で連続する 2 行（stopSequence が
 * 隣どうし）の両方に時刻がある列車だけを数え、前の駅の発 → 次の駅の着の分の中央値を取る。
 * 途中駅の時刻が空の区間を推測で埋める（estimatePassingStops）比率に使う。
 */
export function buildStandardRunMinutes(
    trips: readonly TripDetailsDto[],
): Map<string, number> {
    const samples = new Map<string, number[]>();
    for (const trip of trips) {
        const sorted = [...(trip.times ?? [])].sort(
            (a, b) => (a.stopSequence ?? 0) - (b.stopSequence ?? 0),
        );
        for (let i = 1; i < sorted.length; i++) {
            const from = sorted[i - 1];
            const to = sorted[i];
            if (from.stationId == null || to.stationId == null) {
                continue;
            }
            const departure = resolveDeparture(EPOCH, from);
            const arrival = resolveArrival(EPOCH, to);
            if (departure === undefined || arrival === undefined) {
                continue;
            }
            const minutes =
                (arrival.getTime() - departure.getTime()) / (60 * 1000);
            if (minutes <= 0) {
                continue;
            }
            const key = runKey(from.stationId, to.stationId);
            const list = samples.get(key) ?? [];
            list.push(minutes);
            samples.set(key, list);
        }
    }

    const result = new Map<string, number>();
    for (const [key, values] of samples) {
        result.set(key, median(values));
    }
    return result;
}

function pad2(value: number): string {
    return String(value).padStart(2, '0');
}

/**
 * 時刻のある 2 停車（from の発・to の着）のあいだにある、時刻が空の通過駅（between。
 * stopSequence 順）に、推測した通過時刻を入れた複製を返す。
 *
 * 各駅間の標準の運転時間（standardRunMinutes。向きが無ければ逆向き）の比率で、
 * from の発から to の着までを割り振る（両端の時刻はそのまま）。標準時間の出せない
 * 駅間は、出せた駅間の平均で補う。1 つも出せなければ均等に割る。
 * 推測した時刻は着・発とも同じ（停車しない）で、秒まで持つ。
 */
export function estimatePassingStops(params: {
    from: TimeDetailsDto;
    to: TimeDetailsDto;
    between: readonly TimeDetailsDto[];
    standardRunMinutes: ReadonlyMap<string, number>;
    base: Date;
}): TimeDetailsDto[] {
    const { from, to, between, standardRunMinutes, base } = params;
    if (between.length === 0) {
        return [];
    }
    const departure = resolveDeparture(base, from);
    const arrival = resolveArrival(base, to);
    if (departure === undefined || arrival === undefined) {
        return [];
    }
    const totalMs = arrival.getTime() - departure.getTime();
    if (totalMs <= 0) {
        return [];
    }

    const chain = [from, ...between, to];
    const weights: (number | undefined)[] = [];
    for (let i = 1; i < chain.length; i++) {
        const a = chain[i - 1].stationId;
        const b = chain[i].stationId;
        weights.push(
            a != null && b != null
                ? (standardRunMinutes.get(runKey(a, b)) ??
                      standardRunMinutes.get(runKey(b, a)))
                : undefined,
        );
    }
    const known = weights.filter((w): w is number => w !== undefined);
    const fallback =
        known.length > 0
            ? known.reduce((sum, w) => sum + w, 0) / known.length
            : 1;
    const filled = weights.map((w) => w ?? fallback);
    const totalWeight = filled.reduce((sum, w) => sum + w, 0);

    const dayStart = new Date(base);
    dayStart.setHours(0, 0, 0, 0);

    const estimated: TimeDetailsDto[] = [];
    let cumulative = 0;
    between.forEach((stop, index) => {
        cumulative += filled[index];
        const at = new Date(
            departure.getTime() +
                Math.round((totalMs * cumulative) / totalWeight / 1000) * 1000,
        );
        const offsetMs = at.getTime() - dayStart.getTime();
        const dayIndex = Math.floor(offsetMs / DAY_MS);
        const secondsOfDay = Math.round((offsetMs - dayIndex * DAY_MS) / 1000);
        const text = `${pad2(Math.floor(secondsOfDay / 3600))}:${pad2(
            Math.floor((secondsOfDay % 3600) / 60),
        )}:${pad2(secondsOfDay % 60)}`;
        estimated.push({
            ...stop,
            arrivalTime: text,
            departureTime: text,
            arrivalDays: dayIndex + 1,
            departureDays: dayIndex + 1,
        });
    });
    return estimated;
}
