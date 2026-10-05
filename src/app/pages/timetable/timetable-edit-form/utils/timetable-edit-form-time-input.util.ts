/**
 * 格子の時刻セルで打った文字を 'HH:mm' にする。
 * 数字だけを読み、3 桁は先頭に 0 を足す（930 → 09:30）。
 * 空は null（時刻を消す）、読めないものは undefined（呼び出し側で元に戻す）。
 */
export function normalizeTimeDigits(
    raw: string | null | undefined,
): string | null | undefined {
    const digits = (raw ?? '').replace(/\D/g, '');
    if (digits.length === 0) return null;
    if (digits.length < 3 || digits.length > 4) return undefined;

    const padded = digits.padStart(4, '0');
    const hour = Number(padded.slice(0, 2));
    const minute = Number(padded.slice(2));
    if (hour > 23 || minute > 59) return undefined;

    return `${padded.slice(0, 2)}:${padded.slice(2)}`;
}

/** フォーカス中の表示（数字 4 桁）。'11:54' → '1154' */
export function toEditDigits(time: string | null | undefined): string {
    return (time ?? '').replace(':', '');
}
