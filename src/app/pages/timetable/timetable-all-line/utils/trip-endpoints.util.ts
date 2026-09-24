import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { formatDiaTime } from './format-dia-time.util';

/** 列車の停車を停車順（stopSequence）に並べる。 */
function stopsInOrder(trip: TripDetailsDto): TimeDetailsDto[] {
    return [...trip.times].sort(
        (a, b) => (a.stopSequence ?? 0) - (b.stopSequence ?? 0),
    );
}

/**
 * 停車順で見て、最初の表示駅より前・最後の表示駅より後に、表に出ていない駅（路線の
 * 絞り込みで隠れた駅）へ停まるか。表示駅かどうかは `visible`（表示駅の ID を鍵に持つ Map / Set）で引く。
 * 表示駅に 1 つも停まらない列車は、どちらも false（上下とも「‥」のまま）。
 */
export function hiddenStopsAround(
    trip: TripDetailsDto,
    visible: { has(stationId: string): boolean },
): { before: boolean; after: boolean } {
    const stops = stopsInOrder(trip);
    const first = stops.findIndex((t) => visible.has(t.stationId));
    if (first < 0) return { before: false, after: false };
    let last = stops.length - 1;
    while (!visible.has(stops[last].stationId)) last--;
    return { before: first > 0, after: last < stops.length - 1 };
}

/** 表示駅に 1 つでも停まるか（路線の絞り込み中、停まらない列車は列から外す）。 */
export function hasVisibleStop(
    trip: TripDetailsDto,
    visible: { has(stationId: string): boolean },
): boolean {
    return trip.times.some((time) => visible.has(time.stationId));
}

export type TripEndpoints = {
    originName: string;
    /** 始発駅の発時刻（無ければ着）。全線時刻表の書式（「-500」） */
    originTime: string;
    terminusName: string;
    /** 終着駅の着時刻（無ければ発）。全線時刻表の書式 */
    terminusTime: string;
};

/**
 * 列車の始発駅・終着駅とその時刻（停車順で最初・最後の停車）。表の上端「始発駅」「始発時刻」、
 * 下端「終着時刻」「終着駅」の行に出す（ユーザー指示 2026-09-24。絞り込みの有無によらず全列車）。
 */
export function tripEndpoints(
    trip: TripDetailsDto,
    stationNames: ReadonlyMap<string, string>,
): TripEndpoints {
    const stops = stopsInOrder(trip);
    const origin = stops[0];
    const terminus = stops[stops.length - 1];
    return {
        originName: (origin && stationNames.get(origin.stationId)) ?? '',
        originTime: formatDiaTime(origin?.departureTime ?? origin?.arrivalTime),
        terminusName: (terminus && stationNames.get(terminus.stationId)) ?? '',
        terminusTime: formatDiaTime(
            terminus?.arrivalTime ?? terminus?.departureTime,
        ),
    };
}
