/** URL の値を読んだ結果。無い（missing）と不正（invalid）を分ける */
export type UrlParam<T> =
    { kind: 'missing' } | { kind: 'invalid' } | { kind: 'ok'; value: T };

/**
 * null は missing、parse が null を返したら invalid。
 * 空の値（`time=` など）は既定では invalid。train-diagram・train-location だけが
 * `emptyAsMissing: true` で「無い」として読む（空の値を今まで補っていたため。台帳の決め事）。
 */
export function readUrlParam<T>(
    raw: string | null,
    parse: (raw: string) => T | null,
    options: { emptyAsMissing?: boolean } = {},
): UrlParam<T> {
    if (raw === null) return { kind: 'missing' };
    if (raw === '' && options.emptyAsMissing) return { kind: 'missing' };
    const value = parse(raw);
    return value === null ? { kind: 'invalid' } : { kind: 'ok', value };
}

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * UUID として読む。UUID でないもの（"undefined" など）は null。
 * Angular は matrix の値の undefined を "undefined" と書くので、そのまま API に送ると 422 になる
 * （2026-11-07 の本番）。
 */
export function parseUuid(raw: string): string | null {
    return UUID_PATTERN.test(raw) ? raw : null;
}

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `yyyy-MM-dd` で、暦にある日だけ通す。文字列のまま返す */
export function parseDateKey(raw: string): string | null {
    const m = DATE_KEY_PATTERN.exec(raw);
    if (!m) return null;
    const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const date = new Date(Date.UTC(year, month - 1, day));
    // setUTCFullYear で 0〜99 年の補正を避ける
    date.setUTCFullYear(year);
    return date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
        ? raw
        : null;
}

/** 10 進の整数（符号なし・先頭の 0 なし）で min 以上 max 以下を通す。`7.5`・`1e1`・` 7`・`07` は null（同じ値の別 URL を作らない） */
export function parseIntInRange(
    min: number,
    max: number,
): (raw: string) => number | null {
    return (raw) => {
        if (!/^(0|[1-9]\d*)$/.test(raw)) return null;
        const value = Number(raw);
        return value >= min && value <= max ? value : null;
    };
}

/** `'true'` → true・`'false'` → false。それ以外は null */
export function parseBooleanFlag(raw: string): boolean | null {
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return null;
}

/**
 * routerLink の配列から、matrix param の undefined・null の値を落とす。
 * Angular は undefined を "undefined" と書くので、そのまま渡すと不正な URL になる（404 になる）。
 */
export function omitNullishParams(
    commands: readonly unknown[],
): readonly unknown[] {
    return commands.map((command) => {
        if (command === null || typeof command !== 'object') return command;
        if (Array.isArray(command)) return command;
        return Object.fromEntries(
            Object.entries(command).filter(
                ([, value]) => value !== undefined && value !== null,
            ),
        );
    });
}
