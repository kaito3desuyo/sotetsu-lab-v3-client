import { joinSummaryParts } from 'src/app/shared/control-band/control-band-summary.util';

/** 細帯の要約。例「本線 現在時刻（今日のダイヤ）」「本線 8:00 指定 平日」。 */
export function formatTrainLocationSummary(params: {
    routeName: string | null | undefined;
    mode: 'now' | 'specified';
    timeText: string;
    calendarName: string | null | undefined;
}): string {
    if (params.mode === 'now') {
        return joinSummaryParts([params.routeName, '現在時刻（今日のダイヤ）']);
    }
    return joinSummaryParts([
        params.routeName,
        `${params.timeText.replace(/^0(\d)/, '$1')} 指定`,
        params.calendarName,
    ]);
}
