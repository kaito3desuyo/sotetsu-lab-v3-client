/**
 * サーバーで描いた HTML を CDN に置く長さ（spec 6.1・6.2）。ブラウザには置かない（max-age=0）。
 * - long: 改正か入力でしか変わらないページ。1 週間置き、期限が切れても 1 日は古いものをすぐ返して裏で描き直す。入力されたら API がタグで失効させる
 * - short: 今日を含む過去の運用情報・404・リダイレクト。1 分
 * - no-store: 入力・ログインのページ、API の取得に失敗したまま描いたページ
 */
export type CachePolicy = 'long' | 'short' | 'no-store';

export const CACHE_CONTROL: Record<CachePolicy, string> = {
    long: 'public, max-age=0, s-maxage=604800, stale-while-revalidate=86400, stale-if-error=604800',
    short: 'public, max-age=0, s-maxage=60, stale-while-revalidate=60, stale-if-error=86400',
    'no-store': 'no-store',
};

/** キャッシュタグを載せる応答ヘッダー。CloudFront の CacheTagConfig の HeaderName と同じにする（2c） */
export const CACHE_TAG_HEADER = 'Cache-Tag';

/** CloudFront が 1 つの応答で受けるタグの数の上限 */
export const MAX_CACHE_TAGS = 50;

/** そのダイヤの列車情報が書き換わったら失効させるタグ */
export function calendarCacheTag(calendarId: string): string {
    return `calendar:${calendarId}`.toLowerCase();
}

/** その日の目撃が後から書き換わったら失効させるタグ（日付は YYYY-MM-DD） */
export function sightingDateCacheTag(date: string): string {
    return `sighting-date:${date}`;
}
