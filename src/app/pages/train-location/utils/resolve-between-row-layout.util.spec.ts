import { TrainLocationCard } from '../interfaces/train-location-card.interface';
import { TrainLocationBetweenCardEntry } from '../interfaces/train-location-row.interface';
import {
    BETWEEN_ROW_BASE_HEIGHT_PX,
    BETWEEN_ROW_CARD_GAP_PX,
    BETWEEN_ROW_CARD_HEIGHT_PX,
    resolveBetweenRowLayout,
} from './resolve-between-row-layout.util';

function card(tripId: string): TrainLocationCard {
    return {
        tripId,
        tripNumber: tripId,
        tripClassName: '各停',
        tripClassColor: '#8a8a8a',
        destinationName: '横浜',
        direction: 'inbound',
        detailLink: ['/timetable', 'all-line', {}],
    };
}

function entry(
    tripId: string,
    topProgress: number,
): TrainLocationBetweenCardEntry {
    return { card: card(tripId), topProgress };
}

describe('resolveBetweenRowLayout', () => {
    it('空配列なら既定の行高を返し、カードは0件', () => {
        const layout = resolveBetweenRowLayout([], []);

        expect(layout.heightPx).toBe(BETWEEN_ROW_BASE_HEIGHT_PX);
        expect(layout.left).toEqual([]);
        expect(layout.right).toEqual([]);
    });

    it('単一カードは topProgress に応じた px 位置に配置される（重なりの心配がない場合はそのまま反映）', () => {
        const layout = resolveBetweenRowLayout([entry('t1', 0.4)], []);

        const usableHeightPx =
            BETWEEN_ROW_BASE_HEIGHT_PX - BETWEEN_ROW_CARD_HEIGHT_PX;
        expect(layout.left[0].topPx).toBeCloseTo(0.4 * usableHeightPx, 10);
        expect(layout.heightPx).toBe(BETWEEN_ROW_BASE_HEIGHT_PX);
    });

    it('同一レーンに近接した進捗率の複数カードがあっても重ならない（衝突回避の中核）', () => {
        // 3本とも topProgress がほぼ同じ → 素朴な % 変換だと完全に重なるケース
        const layout = resolveBetweenRowLayout(
            [entry('t1', 0.5), entry('t2', 0.5), entry('t3', 0.5)],
            [],
        );

        expect(layout.left).toHaveLength(3);
        // 進捗順を維持しつつ、隣接カード間はカード高さ+ギャップ以上の間隔を持つ
        for (let i = 1; i < layout.left.length; i++) {
            const gap = layout.left[i].topPx - layout.left[i - 1].topPx;
            expect(gap).toBeGreaterThanOrEqual(
                BETWEEN_ROW_CARD_HEIGHT_PX + BETWEEN_ROW_CARD_GAP_PX - 1e-9,
            );
        }
    });

    it('全件を保持する（衝突回避のために省略しない）', () => {
        const entries = Array.from({ length: 6 }, (_, i) =>
            entry(`t${i}`, 0.5),
        );
        const layout = resolveBetweenRowLayout(entries, []);

        expect(layout.left).toHaveLength(6);
        expect(new Set(layout.left.map((p) => p.entry.card.tripId)).size).toBe(
            6,
        );
    });

    it('スタックが既定行高を超える場合は heightPx を必要高まで伸長する', () => {
        const entries = Array.from({ length: 6 }, (_, i) =>
            entry(`t${i}`, 0.5),
        );
        const layout = resolveBetweenRowLayout(entries, []);

        const last = layout.left[layout.left.length - 1];
        expect(layout.heightPx).toBeGreaterThan(BETWEEN_ROW_BASE_HEIGHT_PX);
        expect(layout.heightPx).toBeCloseTo(
            last.topPx + BETWEEN_ROW_CARD_HEIGHT_PX,
            10,
        );
    });

    it('進捗順は保持される（並び替えても入力順に依存しない）', () => {
        const layout = resolveBetweenRowLayout(
            [entry('late', 0.9), entry('early', 0.1), entry('mid', 0.5)],
            [],
        );

        expect(layout.left.map((p) => p.entry.card.tripId)).toEqual([
            'early',
            'mid',
            'late',
        ]);
    });

    it('左右レーンは同一の行高を共有する（駅ノードを挟む対称性のため、片方が伸長すれば両方に反映）', () => {
        const crowdedLeft = Array.from({ length: 6 }, (_, i) =>
            entry(`l${i}`, 0.5),
        );
        const singleRight = [entry('r1', 0.5)];

        const layout = resolveBetweenRowLayout(crowdedLeft, singleRight);

        expect(layout.heightPx).toBeGreaterThan(BETWEEN_ROW_BASE_HEIGHT_PX);
        // 右レーンは1本のみで衝突は起きないが、行高は左に合わせて再計算される
        const usableHeightPx = layout.heightPx - BETWEEN_ROW_CARD_HEIGHT_PX;
        expect(layout.right[0].topPx).toBeCloseTo(0.5 * usableHeightPx, 10);
    });

    it('カード高さ・ギャップ・基準行高を明示指定できる', () => {
        const layout = resolveBetweenRowLayout(
            [entry('t1', 0), entry('t2', 0)],
            [],
            100,
            20,
            10,
        );

        expect(layout.left[0].topPx).toBe(0);
        expect(layout.left[1].topPx).toBe(30); // 0 + 20(card) + 10(gap)
    });
});
