import { TrainLocationBetweenCardEntry } from '../interfaces/train-location-row.interface';

/**
 * 駅間ゾーンの縦位置衝突回避レイアウトの既定値（98 G8: 駅間隔 約85px 相当の
 * 密度に近づけつつ、カード同士の重なりをゼロにするための基準値）。
 */
export const BETWEEN_ROW_BASE_HEIGHT_PX = 52;
export const BETWEEN_ROW_CARD_HEIGHT_PX = 44;
export const BETWEEN_ROW_CARD_GAP_PX = 4;

export interface PositionedBetweenCardEntry {
    entry: TrainLocationBetweenCardEntry;
    topPx: number;
}

export interface BetweenRowLayout {
    /** この行（駅間ゾーン）の描画に必要な高さ。既定値以上に伸長しうる。 */
    heightPx: number;
    left: PositionedBetweenCardEntry[];
    right: PositionedBetweenCardEntry[];
}

/**
 * 駅間走行中カードの縦位置衝突回避レイアウトを計算する純関数（98 G8）。
 *
 * `topProgress`（区間内の線形補間 0..1）をそのまま top% に変換すると、
 * 複数列車が近接した進捗率を持つ場合にカード同士が重なってしまう。
 * 本関数は進捗順（topProgress 昇順）に上から積み上げ、カード高さ+ギャップ
 * 未満の間隔になる場合は下へ押し出すことで、同一区間・同一方向に
 * 複数在線があっても重なりゼロを保証する（全件保持・省略しない）。
 * 押し出しの結果、既定の行高を超える場合は行自体を伸長させる
 * （heightPx を必要最小高まで拡張する。ページは縦スクロール可能なため
 * 切り捨てず全件を表示する）。
 *
 * 左右レーン（上り=left/下り=right）は駅ノードを挟んで同一の行高を
 * 共有する必要があるため、まず両レーンを既定行高で仮計算し、必要高が
 * 既定値を超えるレーンがあれば、その最大値を行高として採用する。
 *
 * 行高を押し上げた張本人のレーン（＝必要高が最終行高と一致するレーン）は
 * 仮計算の結果をそのまま採用する。これを最終行高で再計算してしまうと、
 * 拡大後の器の中で理想位置がさらに広がり、押し出しが再発してより大きな
 * 必要高を要求する……という発散（不動点に収束しない再帰）が起こりうるため。
 * 一方、行高を押し上げていない側のレーン（＝必要高が既定値以内で収まって
 * いた側）は、拡大後の行高で再計算しても理想位置の間隔が広がるだけで
 * 押し出しはむしろ緩和される方向にしか働かないため、最終行高に対して
 * 安全に再計算でき、駅ノードを挟んだ視覚的な釣り合いを保てる。
 */
export function resolveBetweenRowLayout(
    leftEntries: readonly TrainLocationBetweenCardEntry[],
    rightEntries: readonly TrainLocationBetweenCardEntry[],
    baseHeightPx: number = BETWEEN_ROW_BASE_HEIGHT_PX,
    cardHeightPx: number = BETWEEN_ROW_CARD_HEIGHT_PX,
    gapPx: number = BETWEEN_ROW_CARD_GAP_PX,
): BetweenRowLayout {
    const firstPassLeft = resolveLane(
        leftEntries,
        baseHeightPx,
        cardHeightPx,
        gapPx,
    );
    const firstPassRight = resolveLane(
        rightEntries,
        baseHeightPx,
        cardHeightPx,
        gapPx,
    );

    const heightPx = Math.max(
        baseHeightPx,
        firstPassLeft.requiredHeightPx,
        firstPassRight.requiredHeightPx,
    );

    const left =
        firstPassLeft.requiredHeightPx === heightPx
            ? firstPassLeft.positioned
            : resolveLane(leftEntries, heightPx, cardHeightPx, gapPx)
                  .positioned;
    const right =
        firstPassRight.requiredHeightPx === heightPx
            ? firstPassRight.positioned
            : resolveLane(rightEntries, heightPx, cardHeightPx, gapPx)
                  .positioned;

    return { heightPx, left, right };
}

function resolveLane(
    entries: readonly TrainLocationBetweenCardEntry[],
    containerHeightPx: number,
    cardHeightPx: number,
    gapPx: number,
): { positioned: PositionedBetweenCardEntry[]; requiredHeightPx: number } {
    const sorted = [...entries].sort((a, b) => a.topProgress - b.topProgress);
    const usableHeightPx = Math.max(containerHeightPx - cardHeightPx, 0);

    const positioned: PositionedBetweenCardEntry[] = [];
    let previousBottomPx: number | undefined;

    for (const entry of sorted) {
        const idealTopPx = entry.topProgress * usableHeightPx;
        const minTopPx =
            previousBottomPx === undefined ? 0 : previousBottomPx + gapPx;
        const topPx = Math.max(idealTopPx, minTopPx);
        positioned.push({ entry, topPx });
        previousBottomPx = topPx + cardHeightPx;
    }

    const requiredHeightPx = positioned.length
        ? positioned[positioned.length - 1].topPx + cardHeightPx
        : 0;

    return { positioned, requiredHeightPx };
}
