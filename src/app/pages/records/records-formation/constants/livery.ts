/**
 * 車両の改造の記録（種類 `livery`）の値。形式と塗装の組ごとに 1 つ。
 * 値の一覧は docs/superpowers/specs/2026-11-19-records-formation-design.md の「外観（形式と塗装）」の表。
 * 色・帯・模様・先頭の形の描き方も、この下に持つ（手本は .context/mock-deformed.js。値はそのまま写してある）。
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

// ---- 車両の絵の描き方 ----

const SILVER = '#cdd2d8';
const WHITE = '#eceef0';
const NAVY = '#16204a';
const BLUE = '#1c5fc8';
const ORANGE = '#f08a1e';
const RED = '#d6262b';
const TRED = '#e0262d';
/** 白の細線 */
export const LINE = '#f4f5f6';
/** 新7000 旧塗装の斜めの飾りのオレンジ */
export const SLASH_ORANGE = ORANGE;
/** S 帯の赤 */
export const S_BAND_RED = RED;
/** 東急 3020 の水色の線 */
export const SKY = '#3fa9d6';
/** 東急 3020 の先頭車の白 */
export const WHITE_BODY = WHITE;

/** 先頭の形の名前 */
export type NoseKey =
    'flat' | 'slope' | 'round' | 'n12000' | 'n13000' | 'n20000' | 'n3020';

/**
 * 帯: [軒 0〜裾 1 の割合の始まり, 終わり, 色, 扉の所で途切れる実物か]。
 * 絵では途切れさせず続けて描く。
 */
export type Band = readonly [number, number, string, boolean?];

export interface LiveryArt {
    body: string;
    roof: string;
    bands: readonly Band[];
    nose: NoseKey;
    /** 新7000 旧塗装の斜めの飾り */
    slash?: boolean;
    /** 9000 旧塗装の S 帯 */
    sBand?: boolean;
    /** 先頭の端の縦の帯の色 */
    frontBand?: string;
    /** 東急 3020 の先頭車の白と水色の線 */
    cab3020?: boolean;
}

/** 車体は軒 0・裾 1 の高さ H に対して、前にいちばん出た所からの下がりを同じ単位で持つ。 */
export interface NoseShape {
    /** [v（軒 0〜裾 1）, 前に一番出た所から下がる量（車体の高さを 1）] */
    p: readonly (readonly [number, number])[];
    /** 上の角の丸み */
    tr: number;
    /** 下の角の丸み */
    br: number;
}

const BOX: NoseShape = {
    p: [
        [0, 0],
        [1, 0],
    ],
    tr: 0.08,
    br: 0.03,
};

/**
 * 先頭の横から見た形。n12000・n13000 は真横に近い写真で測った。n20000・n3020 は斜めの写真からの推定。
 */
export const NOSE: Readonly<Record<NoseKey, NoseShape>> = {
    flat: BOX,
    slope: BOX,
    round: {
        p: [
            [0, 0],
            [1, 0],
        ],
        tr: 0.12,
        br: 0.04,
    },
    n12000: {
        p: [
            [0, 0.34],
            [0.09, 0.27],
            [0.22, 0.19],
            [0.35, 0.12],
            [0.46, 0.066],
            [0.55, 0.03],
            [0.62, 0],
            [0.8, 0],
            [1, 0.01],
        ],
        tr: 0.07,
        br: 0.04,
    },
    n13000: {
        p: [
            [0, 0.23],
            [0.13, 0.18],
            [0.24, 0.13],
            [0.39, 0.077],
            [0.5, 0.03],
            [0.61, 0.005],
            [0.75, 0],
            [0.89, 0.005],
            [1, 0.04],
        ],
        tr: 0.07,
        br: 0.05,
    },
    n20000: {
        p: [
            [0, 0.06],
            [0.5, 0.01],
            [1, 0],
        ],
        tr: 0.08,
        br: 0.03,
    },
    n3020: {
        p: [
            [0, 0.14],
            [0.35, 0.05],
            [0.6, 0],
            [1, 0.02],
        ],
        tr: 0.1,
        br: 0.06,
    },
};

/** 先頭でない側の端 */
export const END_SHAPE: NoseShape = {
    p: [
        [0, 0],
        [1, 0],
    ],
    tr: 0.04,
    br: 0.03,
};

export const LIVERY_ART: Readonly<Record<Livery, LiveryArt>> = {
    '7000': {
        body: '#c3c8ce',
        roof: '#9aa0a6',
        bands: [
            [0.04, 0.08, RED],
            [0.93, 0.97, RED, true],
        ],
        nose: 'flat',
    },
    'new7000-red': {
        body: SILVER,
        roof: '#9aa0a6',
        bands: [
            [0.609, 0.782, ORANGE],
            [0.639, 0.754, LINE],
            [0.648, 0.745, RED],
        ],
        nose: 'flat',
        slash: true,
    },
    'new7000-group': {
        body: SILVER,
        roof: '#9aa0a6',
        bands: [
            [0, 0.11, BLUE],
            [0.91, 0.975, ORANGE, true],
        ],
        nose: 'flat',
    },
    '8000-red': {
        body: SILVER,
        roof: '#a9afb5',
        bands: [
            [0.76, 0.99, LINE],
            [0.78, 0.85, RED],
            [0.87, 0.93, RED],
            [0.96, 0.99, RED],
        ],
        nose: 'slope',
    },
    '8000-group': {
        body: WHITE,
        roof: '#a9afb5',
        bands: [
            [0, 0.1, BLUE],
            [0.87, 0.93, ORANGE, true],
        ],
        nose: 'slope',
    },
    '8000-ynb': { body: NAVY, roof: '#8a9099', bands: [], nose: 'slope' },
    '9000-red': {
        body: SILVER,
        roof: '#a9afb5',
        bands: [
            [0.72, 0.906, RED],
            [0.807, 0.843, LINE],
        ],
        nose: 'slope',
        sBand: true,
    },
    '9000-group': {
        body: WHITE,
        roof: '#a9afb5',
        bands: [
            [0, 0.1, BLUE],
            [0.88, 0.93, ORANGE, true],
        ],
        nose: 'slope',
    },
    '9000-ynb': { body: NAVY, roof: '#8a9099', bands: [], nose: 'slope' },
    '10000-group': {
        body: SILVER,
        roof: '#9ea4ab',
        bands: [
            [0, 0.15, BLUE],
            [0.88, 0.95, ORANGE, true],
        ],
        nose: 'round',
        frontBand: BLUE,
    },
    '10000-ynb': { body: NAVY, roof: '#8a9099', bands: [], nose: 'round' },
    '11000': {
        body: SILVER,
        roof: '#9ea4ab',
        bands: [
            [0, 0.15, BLUE],
            [0.88, 0.95, ORANGE, true],
        ],
        nose: 'round',
        frontBand: BLUE,
    },
    '12000': { body: NAVY, roof: '#c9cdd2', bands: [], nose: 'n12000' },
    '13000': { body: NAVY, roof: '#c9cdd2', bands: [], nose: 'n13000' },
    '20000': { body: NAVY, roof: '#8e949c', bands: [], nose: 'n20000' },
    '21000': { body: NAVY, roof: '#8e949c', bands: [], nose: 'n20000' },
    'tokyu-3000': {
        body: SILVER,
        roof: '#a9afb5',
        bands: [
            [0.62, 0.73, TRED, true],
            [0.75, 0.79, '#1c2a5a', true],
        ],
        nose: 'flat',
    },
    'tokyu-3020': {
        body: SILVER,
        roof: '#a9afb5',
        bands: [
            [0, 0.178, WHITE],
            [0.166, 0.19, SKY],
        ],
        nose: 'n3020',
        cab3020: true,
    },
    'tokyu-5050': {
        body: SILVER,
        roof: '#a9afb5',
        bands: [
            [0, 0.08, '#f07f8c'],
            [0.58, 0.78, TRED, true],
        ],
        nose: 'slope',
    },
    'tokyu-5080': {
        body: SILVER,
        roof: '#a9afb5',
        bands: [
            [0, 0.08, '#3a5fa8'],
            [0.61, 0.77, TRED, true],
        ],
        nose: 'slope',
    },
    'e233-7000': {
        body: SILVER,
        roof: '#a9afb5',
        bands: [[0.52, 0.71, '#00a06a']],
        nose: 'round',
    },
};

/** 塗装の記録が無い車両。灰色一色。 */
export const GREY_ART: LiveryArt = {
    body: '#b8bdc4',
    roof: '#9aa0a6',
    bands: [],
    nose: 'flat',
};

/** 台車の色 */
export const BOGIE_COLOR = '#3b3f46';

/** 画面に出す塗装の名前（spec の「外観」の表の外観の名前） */
export const LIVERY_LABELS: Readonly<Record<Livery, string>> = {
    '7000': '7000',
    'new7000-red': '新7000 の旧塗装',
    'new7000-group': '新7000 のグループカラー',
    '8000-red': '8000 の旧塗装',
    '8000-group': '8000 のグループカラー',
    '8000-ynb': '8000 の YNB',
    '9000-red': '9000 の旧塗装',
    '9000-group': '9000 のグループカラー',
    '9000-ynb': '9000 の YNB',
    '10000-group': '10000 のグループカラー',
    '10000-ynb': '10000 の YNB',
    '11000': '11000',
    '12000': '12000',
    '13000': '13000',
    '20000': '20000',
    '21000': '21000',
    'tokyu-3000': '東急 3000',
    'tokyu-3020': '東急 3020',
    'tokyu-5050': '東急 5050',
    'tokyu-5080': '東急 5080',
    'e233-7000': 'JR E233-7000',
};
