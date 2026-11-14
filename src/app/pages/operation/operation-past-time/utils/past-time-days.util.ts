/** 過去の運用情報で選べる日数の下限（検索フォームと URL の検証で共有する）。0 日だと日付が作られず検索しないので 1 日から */
export const PAST_TIME_DAYS_MIN = 1;
/** 過去の運用情報で選べる日数の上限（API は期間を 31 日までに制限している） */
export const PAST_TIME_DAYS_MAX = 30;
