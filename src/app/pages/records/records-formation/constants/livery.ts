/**
 * 車両の改造の記録（種類 `livery`）の値。形式と塗装の組ごとに 1 つ。
 * 値の一覧は docs/superpowers/specs/2026-11-19-records-formation-design.md の「外観（形式と塗装）」の表。
 * 色・帯・先頭の形は Task 9 でここに足す。
 */
export const LIVERIES = [
    '7000',
    'new7000-red',
    'new7000-group',
    '8000-red',
    '8000-group',
    '8000-ynb',
    '9000-red',
    '9000-group',
    '9000-ynb',
    '10000-group',
    '10000-ynb',
    '11000',
    '12000',
    '13000',
    '20000',
    '21000',
    'tokyu-3000',
    'tokyu-3020',
    'tokyu-5050',
    'tokyu-5080',
    'e233-7000',
] as const;

export type Livery = (typeof LIVERIES)[number];

/** 表に無い値は null（灰色）として扱う。 */
export const toLivery = (value: string | null | undefined): Livery | null =>
    (LIVERIES as readonly string[]).includes(value ?? '')
        ? (value as Livery)
        : null;
