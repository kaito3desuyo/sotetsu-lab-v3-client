import { parseISO } from 'date-fns';
import { format, toZonedTime } from 'date-fns-tz';
import { toDisplayTime } from 'src/app/core/utils/railway-day';
import { FormationDayBasis } from './formation-day.util';

/** 運用の決め手の呼び名（R4） */
export const formationBasisLabel: Record<FormationDayBasis, string> = {
    sighting: '目撃',
    transfer: 'ダイヤの乗り移り',
    circulated: '順送り?',
    'carried-over': '同日引き継ぎ?',
    unknown: '不明',
};

/** 運用番号に「?」を付ける決め手か（目撃・ダイヤの乗り移りは確かなこと） */
export const isInferredBasis = (basis: FormationDayBasis): boolean =>
    basis === 'circulated' || basis === 'carried-over';

/**
 * ダイヤの days（その日の列車は 1、翌日 0 時台は 2）を 0 始まりにする。無ければその日（0）。
 * toDisplayTime・toServiceSeconds は 0 始まりの日数を受けるので、渡す前にこれを通す
 */
export const toZeroBasedDays = (days: number | null | undefined): number =>
    (days ?? 1) - 1;

/** 'HH:mm'（24 時超えはそのまま 25:10 のように出す）。時刻が無ければ空 */
export function formatClock(
    days: number | null | undefined,
    time: string | null | undefined,
): string {
    return time ? toDisplayTime(toZeroBasedDays(days), time) : '';
}

/** ISO の時刻を日本時間の 'HH:mm' にする */
export function formatSightingClock(iso: string | undefined): string {
    if (!iso) return '';
    return format(toZonedTime(parseISO(iso), 'Asia/Tokyo'), 'HH:mm', {
        timeZone: 'Asia/Tokyo',
    });
}

/** 運用番号のチップのリンク先（運用行路図）。運用 ID が分からなければリンクにしない */
export function routeDiagramLink(
    operationId: string | null | undefined,
): readonly unknown[] | undefined {
    return operationId
        ? ['/operation', 'route-diagram', { operation_id: operationId }]
        : undefined;
}
