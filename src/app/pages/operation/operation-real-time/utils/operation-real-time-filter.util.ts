import { matchesGroupFilter } from 'src/app/shared/operation-group.util';

/**
 * 編成の所属会社（`formations.agencyId`）による絞り込み判定。
 * 非破壊フィルタ: 未選択（空配列）時は常に true（全件表示）。
 * 複数選択時は OR。agencyId が解決できない場合、絞り込み中は除外する。
 *
 * 運用群の判定は運用表と共有するため `src/app/shared/operation-group.util.ts` にある。
 */
export function matchesAgencyFilter(
    agencyId: string | undefined,
    selectedAgencyIds: string[],
): boolean {
    if (selectedAgencyIds.length === 0) return true;
    if (!agencyId) return false;
    return selectedAgencyIds.includes(agencyId);
}

/**
 * 運用順の表と細帯の件数で同じ絞り込みを使う。運用群は運用番号、会社は予想編成の所属会社で見る。
 */
export function filterRealTimeOperations<
    T extends { operationNumber?: string },
>(
    operations: T[],
    selectedAgencyIds: string[],
    selectedGroupNames: string[],
    timeCrossSections: Record<
        string,
        | {
              expectedSighting?: {
                  formation?: { formationId?: string } | null;
              } | null;
          }
        | undefined
    >,
    formations: { formationId: string; agencyId?: string }[],
): T[] {
    return operations.filter((operation) => {
        if (
            !matchesGroupFilter(operation.operationNumber, selectedGroupNames)
        ) {
            return false;
        }
        const expectedFormation =
            timeCrossSections[operation.operationNumber]?.expectedSighting
                ?.formation;
        const agencyId = expectedFormation
            ? formations.find(
                  (f) => f.formationId === expectedFormation.formationId,
              )?.agencyId
            : undefined;
        return matchesAgencyFilter(agencyId, selectedAgencyIds);
    });
}
