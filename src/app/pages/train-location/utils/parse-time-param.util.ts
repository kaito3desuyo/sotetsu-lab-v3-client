import { setHours, setMinutes, setSeconds } from 'date-fns';

export type ParsedTime = { hours: number; minutes: number };

/**
 * matrix param `time`（"HHmm" 形式・4 桁。例: "0730"）のパース・整形・時刻入力用変換を行う純関数群。
 * N2 の時刻指定モードは 00:00〜23:59 の壁時計時刻をピッカーで選ぶだけで良く（架空の 24 時超え表記を
 * ピッカーで直接選ばせる必要はない）、深夜帯（0:00〜3:59）の営業日判定は `estimatePositions` 側の
 * `getRailwayDate` に一任する（35-architecture-new-pages.md §3）。
 */
export function parseTimeParam(value: string | null): ParsedTime | undefined {
    if (!value) {
        return undefined;
    }
    const match = /^(\d{2})(\d{2})$/.exec(value);
    if (!match) {
        return undefined;
    }
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return undefined;
    }
    return { hours, minutes };
}

export function formatTimeParam(time: ParsedTime): string {
    return `${String(time.hours).padStart(2, '0')}${String(time.minutes).padStart(2, '0')}`;
}

/** `<input type="time">` にバインドする "HH:mm" 表記へ変換する。 */
export function toTimeInputValue(time: ParsedTime): string {
    return `${String(time.hours).padStart(2, '0')}:${String(time.minutes).padStart(2, '0')}`;
}

/** `<input type="time">` の "HH:mm" 表記をパースする。不正な値は undefined。 */
export function fromTimeInputValue(value: string): ParsedTime | undefined {
    const match = /^(\d{2}):(\d{2})$/.exec(value);
    if (!match) {
        return undefined;
    }
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return undefined;
    }
    return { hours, minutes };
}

/** `anchor` の日付部分 + 指定時刻（壁時計 00:00〜23:59）を組み合わせた実時刻 Date を返す。 */
export function toDateWithTime(anchor: Date, time: ParsedTime): Date {
    return setSeconds(setMinutes(setHours(anchor, time.hours), time.minutes), 0);
}
