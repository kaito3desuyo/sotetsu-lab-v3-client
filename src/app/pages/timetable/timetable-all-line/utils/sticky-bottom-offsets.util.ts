/**
 * 箱の下端に積んで固定する段の bottom（px）。上から並べた段の高さを受け取り、
 * 各段について「それより下にある、固定する段の高さの合計」を返す。最後の段は 0。
 * 固定しない段（stuck が false）は null で、その高さは上の段の bottom に数えない。
 */
export function stickyBottomOffsets(
    heights: readonly number[],
    stuck: readonly boolean[] = heights.map(() => true),
): (number | null)[] {
    return heights.map((_, index) =>
        stuck[index]
            ? heights
                  .slice(index + 1)
                  .reduce(
                      (sum, height, offset) =>
                          stuck[index + 1 + offset] ? sum + height : sum,
                      0,
                  )
            : null,
    );
}
