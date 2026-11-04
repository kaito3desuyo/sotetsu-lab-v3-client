type CurrentPositionLike = {
    prev?: unknown | null;
    current?: unknown | null;
    next?: unknown | null;
};

/**
 * 目撃募集の対象を選ぶ。いま走っていて、今日まだ目撃の無い運用。
 *
 * - いま走っている: 在線があり、`current` がある、または `prev` と `next` の両方がある（折り返しの間）。
 *   出庫前（`prev` なし）と入庫後（`next` なし）は含めない。
 * - 今日まだ目撃が無い: 今日の履歴が配列として届いていて、長さ 0。
 *
 * 在線か履歴がまだ届いていない（キーが無い）運用は含めない。読み込み直後に全運用が
 * 「目撃なし」と数えられて募集が光らないようにするため。並びは入力のまま。
 */
export function selectSightingCallOperations<
    T extends { operationNumber?: string },
>(params: {
    operations: T[];
    currentPositions: Record<string, CurrentPositionLike | undefined>;
    histories: Record<string, unknown[] | undefined>;
}): T[] {
    const { operations, currentPositions, histories } = params;
    return operations.filter((operation) => {
        const { operationNumber } = operation;
        if (!operationNumber) return false;
        const position = currentPositions[operationNumber];
        if (!position) return false;
        const isRunning =
            position.current != null ||
            (position.prev != null && position.next != null);
        if (!isRunning) return false;
        const history = histories[operationNumber];
        return Array.isArray(history) && history.length === 0;
    });
}
