export type DiagramWindowOption = {
    /** matrix param 用の値（例: '0700-0800'） */
    value: string;
    /** select 表示用ラベル（例: '7:00〜8:00'） */
    label: string;
    /** 営業日 0 時起点の開始時（4〜25。25 は 24 時超え＝深夜帯） */
    startHour: number;
};

const WINDOW_START_HOUR_MIN = 4;
const WINDOW_START_HOUR_MAX = 25;

function pad2(n: number): string {
    return String(n).padStart(2, '0');
}

/**
 * 時間帯 select の選択肢（1 時間刻み、4:00〜26:00）を生成する純関数。
 * 25 時台（深夜帯・24 時超え表記）まで含めることで終電まで辿れるようにする。
 */
export function generateDiagramWindowOptions(): DiagramWindowOption[] {
    const options: DiagramWindowOption[] = [];
    for (let h = WINDOW_START_HOUR_MIN; h <= WINDOW_START_HOUR_MAX; h++) {
        const next = h + 1;
        options.push({
            value: `${pad2(h)}00-${pad2(next)}00`,
            label: `${h}:00〜${next}:00`,
            startHour: h,
        });
    }
    return options;
}

/**
 * 現在時刻から初期表示に適した時間帯の開始時を算出する（鉄道日境界＝4時考慮）。
 */
export function computeDefaultWindowStartHour(now: Date): number {
    const hour = now.getHours();
    const railwayHour = hour < 4 ? hour + 24 : hour;
    return Math.min(
        Math.max(railwayHour, WINDOW_START_HOUR_MIN),
        WINDOW_START_HOUR_MAX,
    );
}

export function parseWindowStartHour(value: string | null): number | undefined {
    if (!value) {
        return undefined;
    }
    const match = /^(\d{2})00-\d{2}00$/.exec(value);
    if (!match) {
        return undefined;
    }
    return Number(match[1]);
}

export function formatWindowValue(startHour: number): string {
    return `${pad2(startHour)}00-${pad2(startHour + 1)}00`;
}
