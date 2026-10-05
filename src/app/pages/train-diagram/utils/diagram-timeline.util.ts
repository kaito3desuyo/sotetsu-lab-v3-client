/**
 * 列車ダイヤグラムの横軸（1 日ぶん 4:00〜26:00）と縮尺・URL の `time` を扱う純関数群。
 * 横位置の単位は「営業日の 4 時からの分」。24 時超え（翌 0〜2 時）は 1200〜1320 分になる。
 */
export const DIAGRAM_START_HOUR = 4;
export const DIAGRAM_END_HOUR = 26;
export const DIAGRAM_TOTAL_MINUTES =
    (DIAGRAM_END_HOUR - DIAGRAM_START_HOUR) * 60;

/** 「時刻へ跳ぶ」の選択肢（4〜25 時） */
export const DIAGRAM_JUMP_HOURS: readonly number[] = Array.from(
    { length: DIAGRAM_END_HOUR - DIAGRAM_START_HOUR },
    (_, i) => DIAGRAM_START_HOUR + i,
);

/** 横の縮尺（px/分）の段。− / ＋ ボタンはこの段を移る */
export const DIAGRAM_ZOOM_STEPS = [4, 6, 10, 16, 24, 40] as const;
export const DEFAULT_PX_PER_MINUTE = 10;
export const PX_PER_MINUTE_MIN = 4;
export const PX_PER_MINUTE_MAX = 40;

/** 縦（駅軸）の縮尺（px/分）。Ctrl+ホイール・ピンチで連続に変える */
export const DEFAULT_AXIS_PX_PER_MINUTE = 6;
export const AXIS_PX_PER_MINUTE_MIN = 2;
export const AXIS_PX_PER_MINUTE_MAX = 24;

/** 見えている範囲の前後に余分に描く分 */
export const VISIBLE_MARGIN_MINUTES = 30;

const LAST_START_MINUTE = (DIAGRAM_END_HOUR - 1 - DIAGRAM_START_HOUR) * 60;

export function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function pad2(n: number): string {
    return String(n).padStart(2, '0');
}

export function nextZoomStep(current: number, direction: 1 | -1): number {
    if (direction === 1) {
        return (
            DIAGRAM_ZOOM_STEPS.find((step) => step > current) ??
            DIAGRAM_ZOOM_STEPS[DIAGRAM_ZOOM_STEPS.length - 1]
        );
    }
    return (
        [...DIAGRAM_ZOOM_STEPS].reverse().find((step) => step < current) ??
        DIAGRAM_ZOOM_STEPS[0]
    );
}

export function railwayMinuteOfDay(now: Date): number {
    const hour = now.getHours();
    const railwayHour = hour < DIAGRAM_START_HOUR ? hour + 24 : hour;
    return (railwayHour - DIAGRAM_START_HOUR) * 60 + now.getMinutes();
}

export function defaultStartMinute(now: Date): number {
    return clamp(railwayMinuteOfDay(now) - 30, 0, LAST_START_MINUTE);
}

export function parseTimeParam(value: string | null): number | undefined {
    const match = value ? /^(\d{2})(\d{2})$/.exec(value) : null;
    if (!match) {
        return undefined;
    }
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (minute > 59) {
        return undefined;
    }
    const result = (hour - DIAGRAM_START_HOUR) * 60 + minute;
    return result >= 0 && result <= DIAGRAM_TOTAL_MINUTES ? result : undefined;
}

export function formatTimeParam(minute: number): string {
    const total = Math.floor(minute) + DIAGRAM_START_HOUR * 60;
    return `${pad2(Math.floor(total / 60))}${pad2(total % 60)}`;
}

export function parseLegacyWindowParam(
    value: string | null,
): number | undefined {
    const match = value ? /^(\d{2})00-\d{2}00$/.exec(value) : null;
    if (!match) {
        return undefined;
    }
    const minute = (Number(match[1]) - DIAGRAM_START_HOUR) * 60;
    return minute >= 0 && minute <= LAST_START_MINUTE ? minute : undefined;
}

export function formatHourLabel(minute: number): string {
    const total = Math.floor(minute) + DIAGRAM_START_HOUR * 60;
    return `${Math.floor(total / 60)}:${pad2(total % 60)}`;
}

/**
 * Task 13 フィックス: 縦（駅軸）の縮尺（px/分）を解決する。
 * 手動値（Ctrl+ホイール・ピンチで明示的に入れた値）があればそれを使う。
 * 無ければ「観測のある駅間の中で最小の所要分」がちょうど targetPx になるよう
 * 自動で決める（最小二乗で合わせた駅間が最小行高で潰れて見えなくなるのを防ぐ）。
 * 観測のある駅間が1つも無ければ defaultValue にフォールバックする。
 */
export function resolveAxisPxPerMinute(params: {
    manual: number | null;
    smallestObservedGapMinutes: number | undefined;
    targetPx: number;
    defaultValue: number;
    min: number;
    max: number;
}): number {
    const {
        manual,
        smallestObservedGapMinutes,
        targetPx,
        defaultValue,
        min,
        max,
    } = params;
    if (manual !== null) {
        return manual;
    }
    if (
        smallestObservedGapMinutes === undefined ||
        smallestObservedGapMinutes <= 0
    ) {
        return clamp(defaultValue, min, max);
    }
    return clamp(targetPx / smallestObservedGapMinutes, min, max);
}
