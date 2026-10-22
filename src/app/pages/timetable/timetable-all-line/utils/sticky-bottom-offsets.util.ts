/**
 * 箱の下端に積んで固定する段の bottom（px）。上から並べた段の高さを受け取り、
 * 各段について「それより下にある段の高さの合計」を返す。最後の段は 0。
 */
export function stickyBottomOffsets(heights: readonly number[]): number[] {
    return heights.map((_, index) =>
        heights.slice(index + 1).reduce((sum, height) => sum + height, 0),
    );
}
