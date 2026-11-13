import { parseISO } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

/** 鉄道日を決める時刻帯（端末の時刻帯には頼らない） */
export const RAILWAY_TIME_ZONE = 'Asia/Tokyo';

/**
 * 鉄道日の日付境界（この時刻より前は前日の営業日として扱う）
 */
export const RAILWAY_DAY_BOUNDARY_HOUR = 4;

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

/** 日本時間で書く（`formatInTimeZone` を日本時間で包んだもの）。 */
export function formatJst(at: Date, pattern: string): string {
    return formatInTimeZone(at, RAILWAY_TIME_ZONE, pattern);
}

/**
 * 時点が属する営業日の 'yyyy-MM-dd'（日本時間で 4:00 区切り・0:00〜3:59 は前日）。
 * 日本時間は夏時間が無いので、境界の時間ぶん戻して暦の日を読めばよい。
 */
export function railwayDateKey(at: Date = new Date()): string {
    return formatJst(
        new Date(at.getTime() - RAILWAY_DAY_BOUNDARY_HOUR * MS_PER_HOUR),
        'yyyy-MM-dd',
    );
}

/** その営業日の日本時間 0 時の時点。 */
export function railwayDayStart(at: Date): Date {
    return fromZonedTime(`${railwayDateKey(at)}T00:00:00`, RAILWAY_TIME_ZONE);
}

/** 日本時間の時（0〜23）と分。 */
export function railwayClock(at: Date): { hours: number; minutes: number } {
    return {
        hours: Number(formatJst(at, 'H')),
        minutes: Number(formatJst(at, 'm')),
    };
}

/**
 * `at` の営業日の中で、打った時刻の時点。
 * 営業日の 0〜3 時は翌日の暦の日にあたる。
 */
export function railwayTimeToInstant(
    at: Date,
    hours: number,
    minutes: number,
): Date {
    const dayOffset = hours < RAILWAY_DAY_BOUNDARY_HOUR ? MS_PER_DAY : 0;
    return new Date(
        railwayDayStart(at).getTime() +
            dayOffset +
            hours * MS_PER_HOUR +
            minutes * 60_000,
    );
}

/** `anchor` の日本時間の暦の日に、打った時刻を付けた時点。 */
export function jstDateTimeOf(
    anchor: Date,
    hours: number,
    minutes: number,
): Date {
    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    return fromZonedTime(
        `${formatJst(anchor, 'yyyy-MM-dd')}T${hh}:${mm}:00`,
        RAILWAY_TIME_ZONE,
    );
}

function parseHms(time: string): {
    hours: number;
    minutes: number;
    seconds: number;
} {
    const [hours, minutes, seconds] = time.split(':').map(Number);
    return { hours, minutes, seconds };
}

/**
 * `arrivalDays`/`departureDays`（日オフセット）と `HH:mm:ss` 文字列から実時刻を復元する。
 * base は `railwayDayStart()` の値（営業日の日本時間 0 時）。base に days 日と time を
 * ミリ秒で足す（日本時間は夏時間が無いので 1 日は 24 時間）。
 */
export function toAbsoluteTime(base: Date, days: number, time: string): Date {
    const { hours, minutes, seconds } = parseHms(time);
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    return new Date(base.getTime() + days * MS_PER_DAY + totalSeconds * 1000);
}

/**
 * 24 時超え表記の `HH:mm` を生成する（例: days=1, "00:30:00" → "24:30"・days=0, "09:05:00" → "09:05"）。
 */
export function toDisplayTime(days: number, time: string): string {
    const { hours, minutes } = parseHms(time);
    const totalHours = days * 24 + hours;
    const paddedMinutes = String(minutes).padStart(2, '0');
    return `${String(totalHours).padStart(2, '0')}:${paddedMinutes}`;
}

/**
 * `HH:mm:ss` と日オフセット（arrivalDays/departureDays）を、並べ替え・比較用の秒数にする。
 * 起点は固定なので、値どうしの差と大小だけに意味がある。time が無ければ NaN。
 */
export function toServiceSeconds(
    days: number | null | undefined,
    time: string | null | undefined,
): number {
    if (!time) return NaN;
    const { hours, minutes, seconds } = parseHms(time);
    return (days ?? 0) * 86400 + hours * 3600 + minutes * 60 + (seconds || 0);
}

/**
 * 目撃時刻（ISO）を、日本時間で 4:00 区切りの営業日 'yyyy-MM-dd' にする。
 * 日本時間の 0:00〜3:59 は前日の営業日になる。
 */
export function toRailwayDateKey(isoTime: string): string {
    return railwayDateKey(parseISO(isoTime));
}
