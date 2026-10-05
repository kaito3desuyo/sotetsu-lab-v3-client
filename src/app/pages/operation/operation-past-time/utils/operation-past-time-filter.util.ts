/**
 * 過去の運用情報（B9）: 編成所属会社（`formations.agencyId`）による絞り込み判定。
 * 表示フィルタ（非破壊）: 未選択（空配列）時は常に true（全編成行を表示）。
 * 複数選択時は OR。agencyId が解決できない場合、絞り込み中は除外する。
 */
export function matchesAgencyFilter(
    agencyId: string | undefined,
    selectedAgencyIds: string[],
): boolean {
    if (selectedAgencyIds.length === 0) return true;
    if (!agencyId) return false;
    return selectedAgencyIds.includes(agencyId);
}
