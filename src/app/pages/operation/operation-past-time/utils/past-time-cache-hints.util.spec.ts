import { pastTimeCacheHints } from './past-time-cache-hints.util';

describe('pastTimeCacheHints', () => {
    // 日本時間 2026-10-24 12:00（鉄道の日付も 10-24）
    const noon = new Date('2026-10-24T03:00:00Z');
    // 日本時間 2026-10-25 02:00（鉄道の日付はまだ 10-24）
    const lateNight = new Date('2026-10-24T17:00:00Z');

    it('日付が無い（検索前）は長く置き、タグは無い', () => {
        expect(pastTimeCacheHints([], noon)).toEqual({
            policy: 'long',
            tags: [],
        });
    });

    it('過ぎた日だけなら長く置き、日付ごとのタグを付ける', () => {
        expect(pastTimeCacheHints(['2026-10-01', '2026-10-02'], noon)).toEqual({
            policy: 'long',
            tags: ['sighting-date:2026-10-01', 'sighting-date:2026-10-02'],
        });
    });

    it('今日を含むなら短く置く', () => {
        expect(
            pastTimeCacheHints(['2026-10-23', '2026-10-24'], noon).policy,
        ).toBe('short');
    });

    it('先の日を含むなら短く置く（これから目撃が増える）', () => {
        expect(pastTimeCacheHints(['2026-10-30'], noon).policy).toBe('short');
    });

    it('4 時までは前日を今日として数える', () => {
        expect(pastTimeCacheHints(['2026-10-24'], lateNight).policy).toBe(
            'short',
        );
        expect(pastTimeCacheHints(['2026-10-23'], lateNight).policy).toBe(
            'long',
        );
    });

    it('端末の時刻帯によらず、日本時間の営業日を今日とする', () => {
        const now = new Date('2026-11-13T01:30:00Z');

        expect(pastTimeCacheHints(['2026-11-13'], now).policy).toBe('short');
        expect(pastTimeCacheHints(['2026-11-12'], now).policy).toBe('long');
    });
});
