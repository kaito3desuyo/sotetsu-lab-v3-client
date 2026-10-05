import { addDays, addSeconds, startOfDay, subDays } from 'date-fns';

/**
 * 鉄道日の日付境界（この時刻より前は前日の営業日として扱う）
 */
const RAILWAY_DAY_BOUNDARY_HOUR = 4;

function parseHms(time: string): {
    hours: number;
    minutes: number;
    seconds: number;
} {
    const [hours, minutes, seconds] = time.split(':').map(Number);
    return { hours, minutes, seconds };
}

/**
 * 指定日時が属する鉄道営業日の 0 時（Date）を返す。
 * 4 時より前（0:00〜3:59）は前日の営業日として扱う。
 */
export function getRailwayDate(now: Date): Date {
    const startOfNow = startOfDay(now);
    return now.getHours() < RAILWAY_DAY_BOUNDARY_HOUR
        ? subDays(startOfNow, 1)
        : startOfNow;
}

/**
 * `arrivalDays`/`departureDays`（日オフセット）と `HH:mm:ss` 文字列から実時刻を復元する。
 * base の 0 時を起点に days 日ぶんオフセットし、time の時分秒を加算する。
 */
export function toAbsoluteTime(base: Date, days: number, time: string): Date {
    const { hours, minutes, seconds } = parseHms(time);
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    const shiftedBase = addDays(startOfDay(base), days);
    return addSeconds(shiftedBase, totalSeconds);
}

/**
 * 24 時超え表記の文字列を生成する（例: days=1, "00:30:00" → "24:30"）。
 */
export function toDisplayTime(days: number, time: string): string {
    const { hours, minutes } = parseHms(time);
    const totalHours = days * 24 + hours;
    const paddedMinutes = String(minutes).padStart(2, '0');
    return `${totalHours}:${paddedMinutes}`;
}
