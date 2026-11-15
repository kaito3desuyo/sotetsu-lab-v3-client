/**
 * 番号のリンクに付ける、読み上げ用の名前（aria-label）を作る。
 * 番号だけだと何の番号か分からないので、「運用 54」「編成 8709」「列車 6000」の形にする。
 * 推測（番号の終わりの「?」、または inferred）は、「?」を外して後ろに「（推測）」を付ける。
 */
export function toAccessibleNumber(
    prefix: string,
    value: string | null | undefined,
    inferred = false,
): string {
    const text = value ?? '';
    const isInferred = inferred || text.endsWith('?');
    const number = text.endsWith('?') ? text.slice(0, -1) : text;
    return `${prefix} ${number}${isInferred ? '（推測）' : ''}`;
}
