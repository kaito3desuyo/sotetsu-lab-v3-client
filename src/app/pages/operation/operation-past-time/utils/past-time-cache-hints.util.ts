import { format } from 'date-fns';
import {
    sightingDateCacheTag,
    type CachePolicy,
} from 'src/app/core/ssr/cache-control';
import { getRailwayDate } from 'src/app/core/utils/railway-day';

/**
 * 過去の運用情報の HTML を CDN に置く長さとタグ（spec 6.2）。
 * 目撃は 1 件ごとに失効させると無料枠を超えるので、今日（鉄道の日付）以降を含む期間は短く置いて賄う。
 * 過ぎた日は長く置き、後日の訂正のときだけ API が日付のタグで失効させる。
 */
export function pastTimeCacheHints(
    dates: readonly string[],
    now: Date,
): { policy: CachePolicy; tags: string[] } {
    if (!dates.length) return { policy: 'long', tags: [] };
    const today = format(getRailwayDate(now), 'yyyy-MM-dd');
    return {
        policy: dates.some((date) => date >= today) ? 'short' : 'long',
        tags: dates.map(sightingDateCacheTag),
    };
}
