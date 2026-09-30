import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import {
    resolveArrival,
    resolveDeparture,
    timedStops,
} from 'src/app/shared/train-position.util';

/** y を持たない固定の日付（時刻の前後比較にしか使わないため実値は関係ない）。 */
const EPOCH = new Date(2000, 0, 1);

type ChainInfo = {
    index: number;
    operationId: string | undefined;
    direction: number | undefined;
    firstStationId: string | undefined;
    firstDepartureMs: number | undefined;
    lastStationId: string | undefined;
    lastArrivalMs: number | undefined;
    /** 先頭列車の出庫（depotOut）。true ならこの前にはつながない。 */
    headDepotOut: boolean;
    /** 末尾列車の入庫（depotIn）。true ならこの後にはつながない。 */
    tailDepotIn: boolean;
};

function toChainInfo(
    chain: readonly TripDetailsDto[],
    index: number,
): ChainInfo {
    const headTrip = chain[0];
    const tailTrip = chain[chain.length - 1];
    const firstStop = timedStops(headTrip?.times)[0];
    const tailStops = timedStops(tailTrip?.times);
    const lastStop = tailStops[tailStops.length - 1];
    const firstDeparture = firstStop
        ? resolveDeparture(EPOCH, firstStop)
        : undefined;
    const lastArrival = lastStop ? resolveArrival(EPOCH, lastStop) : undefined;
    return {
        index,
        operationId: headTrip?.tripOperationLists?.[0]?.operationId,
        direction: headTrip?.tripDirection,
        firstStationId: firstStop?.stationId ?? undefined,
        firstDepartureMs: firstDeparture?.getTime(),
        lastStationId: lastStop?.stationId ?? undefined,
        lastArrivalMs: lastArrival?.getTime(),
        headDepotOut: headTrip?.depotOut === true,
        tailDepotIn: tailTrip?.depotIn === true,
    };
}

/**
 * Task 14 フィックス（コントローラ判断・fix round 1）:
 *
 * `findContinuations`（種別変更・列番変更）は同じ trip block の中でしか続きを見つけない。
 * 実データでは、同じ運用・同じ方向の列車が別の trip block（同じ編成が続けて走るが、
 * 記録上は別の block）に分かれていることがあり、これを別々の「つながり」として扱うと
 * - 図の線が途中で（本当は同じ列車なのに）切れる
 * - `findTurnbacks` が「隣り合うつながりが同じ駅で接続する」を折り返しと誤検出する
 *   （実際は向きが変わっていない、ただの継続）
 * という問題が起きる（実データ: 西谷の複製行をまたぐ・大和で幅 0〜20px の偽の折り返し）。
 *
 * この関数は、`#buildChains`（trip block ごとの `findContinuations` 結果）が作った
 * chains（各 chain は種別変更・列番変更で既にまとめ済みの trips 配列）を、
 * **同じ運用・同じ方向**で、あるチェーンの末尾列車の最後の停車駅 = 別チェーンの
 * 先頭列車の最初の停車駅、かつ後者の発 ≥ 前者の着、のときに 1 本へつなげ直す。
 *
 * ただし、前の chain の末尾列車が入庫（depotIn）、または後の chain の先頭列車が出庫
 * （depotOut）なら、同じ運用・同じ方向・同じ駅でもつながない（入庫して車庫で何時間も
 * 休んだ後に同じ駅から出庫する便を 1 本の列車扱いすると、その間ずっと停車の横線が
 * 引かれるため。ユーザー指示: 「入出庫マークを双方の便につけて、横線は書かない」）。
 * 別々の chain のままなら、入出庫の印（buildChainDiagramLines の depotMarks）が
 * それぞれの端に付く。
 *
 * 曖昧な場合（ある chain の後続候補が複数、または、ある chain の先行候補が複数）は
 * 繋がず、元のまま別々の chain として残す（誤って無関係な列車を継走扱いしないため）。
 * 循環（理論上起きないはずだが、データ不整合での無限ループを避けるため）は
 * 呼び出し側の走査で visited 集合を使い停止する。
 */
export function mergeSameDirectionContinuations(
    chains: readonly (readonly TripDetailsDto[])[],
): TripDetailsDto[][] {
    const infos = chains.map((chain, index) => toChainInfo(chain, index));

    const byOperation = new Map<string, ChainInfo[]>();
    for (const info of infos) {
        if (!info.operationId) {
            continue;
        }
        const list = byOperation.get(info.operationId) ?? [];
        list.push(info);
        byOperation.set(info.operationId, list);
    }

    /** i（chain のインデックス）→ i の唯一の後続候補 j。曖昧なら入れない。 */
    const nextIndexOf = new Map<number, number>();

    for (const group of byOperation.values()) {
        const successorsOf = new Map<number, number[]>();
        const predecessorsOf = new Map<number, number[]>();

        for (const a of group) {
            if (
                a.direction === undefined ||
                a.lastStationId === undefined ||
                a.lastArrivalMs === undefined ||
                a.tailDepotIn
            ) {
                continue;
            }
            for (const b of group) {
                if (a.index === b.index) {
                    continue;
                }
                if (
                    !b.headDepotOut &&
                    b.direction === a.direction &&
                    b.firstStationId === a.lastStationId &&
                    b.firstDepartureMs !== undefined &&
                    b.firstDepartureMs >= a.lastArrivalMs
                ) {
                    successorsOf.set(a.index, [
                        ...(successorsOf.get(a.index) ?? []),
                        b.index,
                    ]);
                    predecessorsOf.set(b.index, [
                        ...(predecessorsOf.get(b.index) ?? []),
                        a.index,
                    ]);
                }
            }
        }

        for (const [i, successors] of successorsOf) {
            if (successors.length !== 1) {
                continue; // i の後続候補が複数 → 曖昧なので繋がない
            }
            const j = successors[0];
            const predecessors = predecessorsOf.get(j) ?? [];
            if (predecessors.length !== 1) {
                continue; // j の先行候補が複数 → 曖昧なので繋がない
            }
            nextIndexOf.set(i, j);
        }
    }

    const hasPredecessor = new Set(nextIndexOf.values());
    const visited = new Set<number>();
    const merged: TripDetailsDto[][] = [];

    // 先行の無い chain（＝どこかの merged chain の先頭）から順に辿って結合する。
    for (const info of infos) {
        if (hasPredecessor.has(info.index) || visited.has(info.index)) {
            continue;
        }
        const combined: TripDetailsDto[] = [];
        let current: number | undefined = info.index;
        while (current !== undefined && !visited.has(current)) {
            visited.add(current);
            combined.push(...chains[current]);
            current = nextIndexOf.get(current);
        }
        merged.push(combined);
    }

    // 循環等で上のループに乗らなかった chain（理論上起きないが、型安全のためのフォールバック）。
    for (const info of infos) {
        if (!visited.has(info.index)) {
            visited.add(info.index);
            merged.push([...chains[info.index]]);
        }
    }

    return merged;
}
