/**
 * 番号のリンクに付ける、読み上げ用の名前（aria-label）を作る。番号が空のときは null（名前を付けない）。
 * 番号だけだと何の番号か分からないので、「運用 54」「編成 8709」「列車 6000」の形にする。
 * 推測（番号の終わりの「?」、または inferred）は、「?」を外して後ろに「（推測）」を付ける。
 */
export function toAccessibleNumber(
    prefix: string,
    value: string | null | undefined,
    inferred = false,
): string | null {
    const text = (value ?? '').trim();
    const isInferred = inferred || /[?？]$/.test(text);
    const number = text.replace(/[?？]$/, '').trim();
    if (!number) return null;
    return `${prefix} ${number}${isInferred ? '（推定）' : ''}`;
}
