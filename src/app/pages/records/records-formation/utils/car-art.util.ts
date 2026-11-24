import {
    BOGIE_COLOR,
    END_SHAPE,
    GREY_ART,
    LINE,
    LIVERY_ART,
    Livery,
    NOSE,
    NoseShape,
    S_BAND_RED,
    SKY,
    SLASH_ORANGE,
    WHITE_BODY,
} from '../constants/livery';

/** 先頭の向き。左端が先頭なら 'left'、右端なら 'right'、中間車は null。 */
export type CarCab = 'left' | 'right' | null;

export interface RectShape {
    type: 'rect';
    x: number;
    y: number;
    width: number;
    height: number;
    fill: string;
    rx?: number;
    transform?: string;
}

export interface PathShape {
    type: 'path';
    d: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    transform?: string;
}

export type CarShape = RectShape | PathShape;

/** 1 両の絵。窓と扉は描かない。 */
export interface CarArt {
    viewBox: string;
    bodyPath: string;
    bodyFill: string;
    roof: RectShape;
    /** 車体の形で切り抜く帯・模様 */
    clipped: CarShape[];
    bogies: RectShape[];
}

// 車体: 長さ 100、軒 y=4・裾 y=40（実車の約 1.9 倍の太さ）。屋根 y=1.5〜4、台車 y=40〜45。
const W = 100;
const TOP = 4;
const BOT = 40;
const H = BOT - TOP;
const VH = 46;
const y = (v: number): number => TOP + v * H;

const sAt = (p: NoseShape['p'], v: number): number => {
    for (let i = 1; i < p.length; i++) {
        if (v <= p[i][0]) {
            const [v0, s0] = p[i - 1];
            const [v1, s1] = p[i];
            return s0 + ((s1 - s0) * (v - v0)) / (v1 - v0);
        }
    }
    return p[p.length - 1][1];
};

/** 通る点 [s, v] の列（上の角の終わりから下の角の始まりまで） */
const sidePts = (n: NoseShape): [number, number][] => [
    [sAt(n.p, n.tr), n.tr],
    ...n.p
        .filter(([v]) => v > n.tr && v < 1 - n.br)
        .map(([v, sb]): [number, number] => [sb, v]),
    [sAt(n.p, 1 - n.br), 1 - n.br],
];

const smooth = (Q: [number, number][]): string => {
    let d = '';
    for (let i = 0; i < Q.length - 1; i++) {
        const p0 = Q[i - 1] || Q[i];
        const p1 = Q[i];
        const p2 = Q[i + 1];
        const p3 = Q[i + 2] || Q[i + 1];
        d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
    }
    return d;
};

/** 東急 3020 の先頭車：運転台寄りの白い部分と、水色の線が軒から裾へ曲がって下りる所。 */
const cab3020Shapes = (cab: 'left' | 'right'): CarShape[] => {
    // 形は train-ref/rect-3020.png（3121 の側面を扉の 4 隅から正面向きに直した写真、mm）で測った。
    // 原点は運転台に一番近い客用扉の前の端の上。車体の高さ 2500mm（軒 -525・裾 1975）。
    // 曲がる所の形は横も車体の高さの縮尺で描き、白い部分の長さ（乗務員扉の前の端から前まで 3250mm）は車長の縮尺にする。
    const k = H / 2500;
    const X0 = 100 - 3250 / 200 - 1450 * k;
    const X = (mm: number): number => X0 - mm * k;
    const V = (mm: number): number => y(Math.min((mm + 525) / 2500, 0.955));
    // 線は「上の水平」「まっすぐな斜め」「下の水平」を 2 つの丸い角でつなぐ。斜めは写真で読んだ 2 点 (-550,300)・(-1425,1725) を通る直線。
    const dxdy = (-1425 + 550) / (1725 - 300);
    const yTop = -78;
    const yBot = 0.955 * 2500 - 525;
    const vt = [-550 + (yTop - 300) * dxdy, yTop];
    const vb = [-550 + (yBot - 300) * dxdy, yBot];
    const len = Math.hypot(dxdy, 1);
    const ux = dxdy / len;
    const uy = 1 / len;
    const r1 = 350;
    const r2 = 300;
    const P = ([mx, my]: number[]): string => `${X(mx)},${V(my)}`;
    const lineD = `M-1,${V(yTop)} L${P([vt[0] + r1, yTop])} Q${P(vt)} ${P([vt[0] + ux * r1, yTop + uy * r1])} L${P([vb[0] - ux * r2, yBot - uy * r2])} Q${P(vb)} ${P([vb[0] - r2, yBot])} L${W + 1},${V(yBot)}`;
    const transform =
        cab === 'right' ? undefined : `translate(${W},0) scale(-1,1)`;
    const withTransform = <T extends CarShape>(shape: T): T =>
        transform ? { ...shape, transform } : shape;
    return [
        withTransform({
            type: 'rect',
            x: X(-1450),
            y: TOP,
            width: W,
            height: H,
            fill: WHITE_BODY,
        }),
        // 線より上（前）は白
        withTransform({
            type: 'path',
            d: `${lineD} L${W + 1},${TOP - 1} L-1,${TOP - 1} Z`,
            fill: WHITE_BODY,
        }),
        withTransform({
            type: 'path',
            d: lineD,
            stroke: SKY,
            strokeWidth: 60 * k,
        }),
    ];
};

/** 9000 旧塗装の S 帯（側面の右端の先頭車）。形は扉の 4 隅から正面向きに直した写真で mm で測った。 */
const sBandShapes = (): CarShape[] => {
    // 原点は運転台に近い扉の左上。軒 -360mm・裾 1980mm（車体の高さ 2340mm）。
    // 横も車体の高さと同じ縮尺にして形を保ち、扉の左端を車長の 83.9 に置く。
    const X = (mm: number): number => 83.9 + (mm * H) / 2340;
    const V = (mm: number): number => y((mm + 360) / 2340);
    return [
        {
            type: 'path',
            d: `M${X(-1700)},${V(1328)} L${X(-720)},${V(1328)} Q${X(-560)},${V(1328)} ${X(-580)},${V(1180)} L${X(-900)},${V(160)} Q${X(-960)},${V(-280)} ${X(-480)},${V(-280)} L97.6,${V(-280)} Q98.8,${V(-200)} 97.6,${V(-120)} L${X(0)},${V(-120)} Q${X(-330)},${V(-120)} ${X(-290)},${V(180)} L${X(200)},${V(1460)} Q${X(300)},${V(1760)} ${X(80)},${V(1760)} L${X(-1700)},${V(1760)} Z`,
            fill: S_BAND_RED,
        },
        {
            type: 'rect',
            x: 0,
            y: V(1528),
            width: X(250),
            height: V(1612) - V(1528),
            fill: LINE,
        },
    ];
};

/** 新7000 旧塗装の車両番号の横の斜めの飾り。車長の 50.2 を中心に、形は車体の高さの縮尺。白の縁で赤と分ける。 */
const slashShapes = (): CarShape[] => {
    const k = H / 2340;
    const c = 50.2;
    const hw = 320 * k;
    const sh = 150 * k;
    const e = 25 * k;
    const t = y(0.639);
    const b = y(0.754);
    return [
        {
            type: 'path',
            d: `M${c - hw - e + sh},${t} L${c + hw + e + sh},${t} L${c + hw + e - sh},${b} L${c - hw - e - sh},${b} Z`,
            fill: LINE,
        },
        {
            type: 'path',
            d: `M${c - hw + sh},${t} L${c + hw + sh},${t} L${c + hw - sh},${b} L${c - hw - sh},${b} Z`,
            fill: SLASH_ORANGE,
        },
    ];
};

/**
 * 1 両の絵を組み立てる。`livery` が null なら灰色一色。
 * 帯は軒 0・裾 1 の割合で持ち、扉の所でも途切れさせない。
 */
export const buildCarArt = (livery: Livery | null, cab: CarCab): CarArt => {
    const a = livery ? LIVERY_ART[livery] : GREY_ART;
    const Ln = cab === 'left' ? NOSE[a.nose] : END_SHAPE;
    const Rn = cab === 'right' ? NOSE[a.nose] : END_SHAPE;
    const L0 = sAt(Ln.p, 0) * H;
    const L1 = sAt(Ln.p, 1) * H;
    const R0 = W - sAt(Rn.p, 0) * H;
    const R1 = W - sAt(Rn.p, 1) * H;
    const RQ = sidePts(Rn).map(([sb, v]): [number, number] => [
        W - sb * H,
        y(v),
    ]);
    const LQ = sidePts(Ln)
        .map(([sb, v]): [number, number] => [sb * H, y(v)])
        .reverse();
    const bodyPath =
        `M${L0 + Ln.tr * H},${TOP} H${R0 - Rn.tr * H} Q${R0},${TOP} ${RQ[0][0]},${RQ[0][1]}${smooth(RQ)} Q${R1},${BOT} ${R1 - Rn.br * H},${BOT}` +
        ` H${L1 + Ln.br * H} Q${L1},${BOT} ${LQ[0][0]},${LQ[0][1]}${smooth(LQ)} Q${L0},${TOP} ${L0 + Ln.tr * H},${TOP} Z`;

    const rx0 = cab === 'left' ? L0 + Ln.tr * H * 0.6 : 3;
    const rx1 = cab === 'right' ? W - R0 + Rn.tr * H * 0.6 : 3;
    const roof: RectShape = {
        type: 'rect',
        x: rx0,
        y: 1.5,
        width: W - rx0 - rx1,
        height: 4,
        rx: 1.5,
        fill: a.roof,
    };

    const clipped: CarShape[] = [];
    if (a.cab3020 && cab) clipped.push(...cab3020Shapes(cab));
    // S 帯: 側面の右端の先頭車（この向きでは 10 号車、裏側では 1 号車）
    const sb = !!a.sBand && cab === 'right';
    if (!(a.cab3020 && cab)) {
        for (const [t0, t1, c] of a.bands) {
            const end = sb
                ? c === LINE
                    ? 0
                    : 83.9 - (1700 * H) / 2340 + 1
                : W;
            // 扉の所で途切れる帯も、絵では続けて描く
            clipped.push({
                type: 'rect',
                x: 0,
                y: y(t0),
                width: end,
                height: (t1 - t0) * H,
                fill: c,
            });
        }
    }
    if (sb) clipped.push(...sBandShapes());
    if (a.slash) clipped.push(...slashShapes());
    if (a.frontBand && cab === 'left') {
        clipped.push({
            type: 'rect',
            x: 0,
            y: TOP,
            width: 3,
            height: H,
            fill: a.frontBand,
        });
    }
    if (a.frontBand && cab === 'right') {
        clipped.push({
            type: 'rect',
            x: W - 3,
            y: TOP,
            width: 3,
            height: H,
            fill: a.frontBand,
        });
    }

    return {
        viewBox: `0 0 ${W} ${VH}`,
        bodyPath,
        bodyFill: a.body,
        roof,
        clipped,
        bogies: [
            {
                type: 'rect',
                x: 9,
                y: 40.5,
                width: 20,
                height: 4.5,
                rx: 2,
                fill: BOGIE_COLOR,
            },
            {
                type: 'rect',
                x: W - 29,
                y: 40.5,
                width: 20,
                height: 4.5,
                rx: 2,
                fill: BOGIE_COLOR,
            },
        ],
    };
};
