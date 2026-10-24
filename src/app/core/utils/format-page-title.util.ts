/** ページの題名。取ったデータで詳しくするところを括弧に入れる（例「二俣川駅 時刻表（下り・2026/3/14改正 平日）」） */
export function formatPageTitle(
    base: string,
    details: readonly (string | null | undefined)[],
): string {
    const parts = details.filter((part): part is string => !!part);
    return parts.length ? `${base}（${parts.join('・')}）` : base;
}
