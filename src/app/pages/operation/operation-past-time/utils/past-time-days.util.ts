/** 過去の運用情報で選べる日数の下限（検索フォームと URL の読み取りで共有する） */
export const PAST_TIME_DAYS_MIN = 0;
/** 過去の運用情報で選べる日数の上限（API は期間を 31 日までに制限している） */
export const PAST_TIME_DAYS_MAX = 30;

/** URL の days を、検索フォームと同じ範囲に収める。数でないときは下限にする */
export function clampPastTimeDays(days: string): number {
    const value = Number(days);
    if (Number.isNaN(value)) return PAST_TIME_DAYS_MIN;
    return Math.min(PAST_TIME_DAYS_MAX, Math.max(PAST_TIME_DAYS_MIN, value));
}
