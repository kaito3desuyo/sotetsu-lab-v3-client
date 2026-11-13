import { joinSummaryParts } from 'src/app/shared/control-band/control-band-summary.util';

const DIRECTION_LABEL = {
    up: '上り',
    down: '下り',
    both: '上り・下り',
} as const;

/** 畳んだ 1 行の要約。例「本線 下り 平日」。選んだ主なもの（路線・方向）を先に、ダイヤを後に並べる（docs/design.md 操作帯） */
export function formatTrainDiagramSummary(params: {
    routes: string;
    calendarName: string | null | undefined;
    direction: 'up' | 'down' | 'both';
}): string {
    return joinSummaryParts([
        params.routes,
        DIRECTION_LABEL[params.direction],
        params.calendarName,
    ]);
}
