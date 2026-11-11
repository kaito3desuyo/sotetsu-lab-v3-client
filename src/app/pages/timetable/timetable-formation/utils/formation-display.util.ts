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

/** 'H:mm'（24 時超えはそのまま 25:10 のように出す）。時刻が無ければ空 */
export function formatClock(
    days: number | undefined,
    time: string | undefined,
): string {
    return time ? toDisplayTime(days ?? 0, time) : '';
}

/** ISO の時刻を日本時間の 'H:mm' にする */
export function formatSightingClock(iso: string | undefined): string {
    if (!iso) return '';
    return format(toZonedTime(parseISO(iso), 'Asia/Tokyo'), 'H:mm', {
        timeZone: 'Asia/Tokyo',
    });
}
