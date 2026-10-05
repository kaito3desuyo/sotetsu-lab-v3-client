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
