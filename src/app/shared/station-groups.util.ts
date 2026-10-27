import { AgencyDetailsDto } from 'src/app/libs/agency/usecase/dtos/agency-details.dto';
import { RouteDetailsDto } from 'src/app/libs/route/usecase/dtos/route-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { sortByThroughServiceAgency } from './agencies-in-through-service-order.util';
import { InboundDirection } from './inbound-direction.util';
import { StepTarget } from './step-nav/step-target.type';

/** 駅 select の 1 グループ（mat-optgroup 1 つ分）。 */
export interface StationGroup {
    routeId: string;
    /** 「会社名 路線名」（例: 相鉄 本線 / 東急 東横線） */
    label: string;
    /** 路線名だけ（前後の駅で同じ名前の駅を区別するとき。例: 有楽町線） */
    routeName: string;
    stations: StationDetailsDto[];
}

/**
 * 駅 select の選択肢を「会社名 路線名」でまとめる（ユーザー指示 2026-09-23）。
 *
 * 駅別時刻表のページ上部と「時刻表を検索する」カードが使う。会社名は
 * 形式・会社の表示（formatFormationAnnotation）と同じ略称（agencyName）。
 * 路線は会社ごとにまとめ、会社は会社チップと同じ「相鉄と直通を始めた順」、会社の中は
 * routes の順（RouteStationListState が整列済みの系統順）にする（ユーザー指示 2026-09-24。
 * 路線チップと同じ並び）。駅の並びは路線の中の順をそのまま保つ。
 * 路線をまたぐ駅（横浜・二俣川など）は各路線に重ねて出す。
 */
export function buildStationGroups(
    routes: RouteDetailsDto[],
    agencies: AgencyDetailsDto[],
): StationGroup[] {
    return sortByThroughServiceAgency(
        routes,
        (route) => route.agencyId,
        agencies,
    ).map((route) => {
        const agencyName = agencies.find(
            (agency) => agency.agencyId === route.agencyId,
        )?.agencyName;
        return {
            routeId: route.routeId,
            label: [agencyName, route.routeName].filter(Boolean).join(' '),
            routeName: route.routeName,
            stations: (route.routeStationLists ?? []).map((rsl) => rsl.station),
        };
    });
}

/**
 * 前後の駅（駅別時刻表の「前後へ送る」）。今の駅を含む路線ごとに、路線の中の隣を取る。
 * 右（next・›）は上り側、左（prev・‹）は下り側（ユーザー指示 2026-10-23「右を上り・北行で」）。
 * 上りの向きは路線ごとに `inboundDirectionOf` で受け取る（運行系統の始点側。本線は起点の横浜へ、新横浜線は終点の新横浜へ）。
 * 分からない路線は駅の並びのまま（前を左・後を右）。
 * 分岐駅は隣を全部返す（西谷: 左 鶴ヶ峰／右 上星川・羽沢横浜国大）。駅 ID で重複を除く
 * （目黒線と東横線のように同じ駅を持つ路線で、同じ隣が二重に出ないように）。
 */
export function findNeighborStations(
    groups: StationGroup[],
    stationId: string | null | undefined,
    inboundDirectionOf: (group: StationGroup) => InboundDirection | null = () =>
        null,
): { prev: StepTarget[]; next: StepTarget[] } {
    const prev = new Map<string, StepTarget>();
    const next = new Map<string, StepTarget>();
    if (!stationId) return { prev: [], next: [] };

    const routeNameById = new Map<string, string>();
    const add = (
        targets: Map<string, StepTarget>,
        station: StationDetailsDto | undefined,
        routeName: string,
    ) => {
        if (station && !targets.has(station.stationId)) {
            targets.set(station.stationId, {
                id: station.stationId,
                label: station.stationName,
            });
            routeNameById.set(station.stationId, routeName);
        }
    };

    for (const group of groups) {
        const { stations } = group;
        const index = stations.findIndex((s) => s.stationId === stationId);
        if (index < 0) continue;
        const before = stations[index - 1];
        const after = stations[index + 1];
        // 上りが起点へ向かう路線は、並びの前が上り側（右）
        const beforeIsInbound = inboundDirectionOf(group) === 'towardStart';
        add(prev, beforeIsInbound ? after : before, group.routeName);
        add(next, beforeIsInbound ? before : after, group.routeName);
    }

    // 同じ名前の駅が並ぶとき（小竹向原の千川は有楽町線と副都心線で別の駅）だけ、路線名を付ける
    const targets = [...prev.values(), ...next.values()];
    const withRoute = (target: StepTarget): StepTarget =>
        targets.filter((t) => t.label === target.label).length > 1
            ? {
                  ...target,
                  label: `${target.label}（${routeNameById.get(target.id)}）`,
              }
            : target;
    return {
        prev: [...prev.values()].map(withRoute),
        next: [...next.values()].map(withRoute),
    };
}
