import { RouteStationDto } from 'src/app/libs/route/usecase/dtos/route-stations.dto';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-block-details.dto';

/**
 * ダッシュボード最上部「今日の状況」カード背景のミニダイヤグラム（mockup-11）。
 * 現在時刻から ±30 分の窓に、実データ（当日ダイヤの全 trip の停車時刻）から
 * 斜め線（列車の走行線）を生成する純関数。x=時間・y=駅軸位置に正規化した
 * viewBox 座標（0..VIEW_W × 0..VIEW_H）の線分群を返す。現在時刻は x=VIEW_W/2。
 */

export type MiniDiagramLine = { x1: number; y1: number; x2: number; y2: number };

const WINDOW_MINUTES = 30;
export const MINI_DIAGRAM_VIEW_W = 200;
export const MINI_DIAGRAM_VIEW_H = 120;

/** trip times の days は 1-based（day1=営業日当日 / day2=24時超え）。欠落は day1 とみなす。 */
function toAbsoluteMinutes(
    days: number | null | undefined,
    time: string | null | undefined,
): number | undefined {
    if (time == null) {
        return undefined;
    }
    const match = /^(\d{1,2}):(\d{2})/.exec(time);
    if (!match) {
        return undefined;
    }
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    return ((days ?? 1) - 1) * 24 * 60 + hours * 60 + minutes;
}

function resolveStopMinutes(time: TimeDetailsDto): number | undefined {
    return (
        toAbsoluteMinutes(time.arrivalDays, time.arrivalTime) ??
        toAbsoluteMinutes(time.departureDays, time.departureTime)
    );
}

/** 現在時刻を trip times と同じ絶対分（営業日基準・4時境界で前日の続き扱い）へ変換する。 */
function nowToAbsoluteMinutes(now: Date): number {
    const postMidnight = now.getHours() < 4 ? 24 * 60 : 0;
    return postMidnight + now.getHours() * 60 + now.getMinutes();
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

export function buildDashboardMiniDiagram(
    tripBlocks: readonly TripBlockDetailsDto[],
    stationAxis: readonly RouteStationDto[],
    now: Date,
): MiniDiagramLine[] {
    // 駅軸（重複を除いた初出順）→ y 座標マップ。
    const orderedStationIds: string[] = [];
    const seen = new Set<string>();
    for (const station of stationAxis) {
        if (station.stationId && !seen.has(station.stationId)) {
            seen.add(station.stationId);
            orderedStationIds.push(station.stationId);
        }
    }
    if (orderedStationIds.length < 2) {
        return [];
    }
    const yByStationId = new Map(
        orderedStationIds.map((stationId, index) => [
            stationId,
            (index / (orderedStationIds.length - 1)) * MINI_DIAGRAM_VIEW_H,
        ]),
    );

    const nowAbs = nowToAbsoluteMinutes(now);
    const windowStart = nowAbs - WINDOW_MINUTES;
    const windowEnd = nowAbs + WINDOW_MINUTES;
    const toX = (absMinutes: number) =>
        clamp(
            ((absMinutes - windowStart) / (WINDOW_MINUTES * 2)) *
                MINI_DIAGRAM_VIEW_W,
            0,
            MINI_DIAGRAM_VIEW_W,
        );

    const lines: MiniDiagramLine[] = [];

    for (const block of tripBlocks) {
        for (const trip of block.trips ?? []) {
            const stops = [...(trip.times ?? [])]
                .filter(
                    (time) =>
                        time.stationId != null &&
                        yByStationId.has(time.stationId) &&
                        (time.arrivalTime != null || time.departureTime != null),
                )
                .sort((a, b) => (a.stopSequence ?? 0) - (b.stopSequence ?? 0));

            for (let i = 1; i < stops.length; i++) {
                const fromMin = resolveStopMinutes(stops[i - 1]);
                const toMin = resolveStopMinutes(stops[i]);
                if (fromMin === undefined || toMin === undefined) {
                    continue;
                }
                // 区間の時間範囲が窓と重ならなければスキップ。
                if (
                    Math.max(fromMin, toMin) < windowStart ||
                    Math.min(fromMin, toMin) > windowEnd
                ) {
                    continue;
                }
                const y1 = yByStationId.get(stops[i - 1].stationId as string)!;
                const y2 = yByStationId.get(stops[i].stationId as string)!;
                lines.push({
                    x1: toX(fromMin),
                    y1,
                    x2: toX(toMin),
                    y2,
                });
            }
        }
    }

    return lines;
}
