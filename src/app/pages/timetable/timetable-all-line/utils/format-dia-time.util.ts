import { format, parse } from 'date-fns';

/**
 * 時刻（HH:mm:ss）を全線時刻表の書式にする。1 桁の時は「-500」のように頭に「-」を付ける。
 * DiaPro の合字（rlig）がこの書式を時刻の字形に置き換える（フォント同梱の Demo.html と同じ書式）。
 * 混入ではないので消さないこと（2026-07 に一度消して本番とずれた）。
 */
export function formatDiaTime(timeString: string | null | undefined): string {
    if (!timeString) return '';
    let time = format(parse(timeString, 'HH:mm:ss', new Date()), 'Hmm');
    if (time.length === 3) {
        time = '-' + time;
    }
    return time;
}
