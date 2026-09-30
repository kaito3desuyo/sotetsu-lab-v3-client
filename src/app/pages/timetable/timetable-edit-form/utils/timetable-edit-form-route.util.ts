import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import {
    ITimetableEditFormRouteError,
    ITimetableEditFormTimeValue,
} from '../interfaces/timetable-edit-form.interface';
import { ETimetableEditFormStopType } from '../special/enums/timetable-edit-form.enum';

/**
 * 駅 from（格子の位置）から駅 to へ、列車の向きのまま路線をたどって行けるかを返す関数を作る。
 *
 * stations は格子の並び（方向で反転済み）。列車はこの並びの順に進むので、各路線の
 * 駅がこの並びで路線の駅順と同じ向きに出るか逆向きに出るかで、その方向での路線の
 * 向きが決まる（多い方。同数なら両向き）。路線の隣り合う駅をその向きの矢印でつなぐ。
 * 分岐駅の先を両方通る列車（上りで海老名→湘南台、厚木と海老名など）はたどれない。
 * デルタ線のように両方ありうる路線もあるので、呼び出し側は注意に留める。
 * 路線の分からない駅は判定しない（常に true）。
 */
export function buildRouteReachability(
    stations: readonly StationDetailsDto[],
): (from: number, to: number) => boolean {
    const membersByRoute = new Map<string, { index: number; seq: number }[]>();

    stations.forEach((station, index) => {
        for (const list of station.routeStationLists ?? []) {
            const routeId = list.routeId ?? list.route?.routeId;
            if (!routeId || list.stationSequence == null) continue;
            const members = membersByRoute.get(routeId) ?? [];
            members.push({ index, seq: list.stationSequence });
            membersByRoute.set(routeId, members);
        }
    });

    const next: number[][] = stations.map(() => []);
    const known = new Set<number>();

    for (const members of membersByRoute.values()) {
        if (members.length < 2) continue;

        let forward = 0;
        let backward = 0;
        for (let k = 1; k < members.length; k++) {
            const diff = members[k].seq - members[k - 1].seq;
            if (diff > 0) forward++;
            if (diff < 0) backward++;
        }

        const bySeq = [...members].sort((a, b) => a.seq - b.seq);
        for (let k = 1; k < bySeq.length; k++) {
            const a = bySeq[k - 1].index;
            const b = bySeq[k].index;
            if (forward >= backward) next[a].push(b);
            if (backward >= forward) next[b].push(a);
        }
        members.forEach((m) => known.add(m.index));
    }

    const reachable = new Map<number, Set<number>>();
    const reachableFrom = (from: number): Set<number> => {
        let seen = reachable.get(from);
        if (seen) return seen;

        seen = new Set<number>();
        const queue = [from];
        while (queue.length) {
            for (const to of next[queue.shift()]) {
                if (seen.has(to)) continue;
                seen.add(to);
                queue.push(to);
            }
        }
        reachable.set(from, seen);
        return seen;
    };

    return (from, to) =>
        !known.has(from) || !known.has(to) || reachableFrom(from).has(to);
}

/** ‖ 以外の隣り合う 2 駅のうち、路線をたどれないものを列挙する */
export function findRouteErrors(
    times: readonly ITimetableEditFormTimeValue[],
    canReach: (from: number, to: number) => boolean,
): ITimetableEditFormRouteError[] {
    const errors: ITimetableEditFormRouteError[] = [];
    let prevIndex: number | null = null;

    times.forEach((time, index) => {
        if (time.stopType === ETimetableEditFormStopType.NOT_GOING_THROUGH) {
            return;
        }
        if (prevIndex !== null && !canReach(prevIndex, index)) {
            errors.push({ index, prevIndex });
        }
        prevIndex = index;
    });

    return errors;
}

/**
 * 列車（通る駅 id の並び）ごとに、通る駅を全部覆う路線をなるべく少なく選ぶ
 * （まだ覆っていない駅を一番多く持つ路線から順に取る）。
 * 分岐駅 1 駅だけに触れる路線（横浜→二俣川 のいずみ野線）や、駅を共有する
 * 並走路線（東横線を走る列車の目黒線）は、ほかの路線で覆えるので選ばない。
 */
export function routeIdsTraversedBy(
    stationIdsPerTrip: readonly (readonly string[])[],
    stations: readonly StationDetailsDto[],
): Set<string> {
    const routeIdsByStation = new Map(
        stations.map((station) => [
            station.stationId,
            (station.routeStationLists ?? [])
                .map((list) => list.routeId ?? list.route?.routeId)
                .filter((routeId): routeId is string => !!routeId),
        ]),
    );

    const traversed = new Set<string>();
    for (const stationIds of stationIdsPerTrip) {
        const stationsByRoute = new Map<string, Set<string>>();
        for (const stationId of stationIds) {
            for (const routeId of routeIdsByStation.get(stationId) ?? []) {
                const members = stationsByRoute.get(routeId) ?? new Set();
                members.add(stationId);
                stationsByRoute.set(routeId, members);
            }
        }

        const uncovered = new Set(
            [...stationsByRoute.values()].flatMap((members) => [...members]),
        );
        while (uncovered.size) {
            let best: string | null = null;
            let bestCount = 0;
            stationsByRoute.forEach((members, routeId) => {
                const count = [...members].filter((id) =>
                    uncovered.has(id),
                ).length;
                if (count > bestCount) {
                    best = routeId;
                    bestCount = count;
                }
            });
            traversed.add(best);
            stationsByRoute.get(best).forEach((id) => uncovered.delete(id));
        }
    }
    return traversed;
}
