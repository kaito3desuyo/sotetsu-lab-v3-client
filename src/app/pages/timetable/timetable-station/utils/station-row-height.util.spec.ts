import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { estimateStationRowHeight } from './station-row-height.util';

/** 始発駅の発車だけを持つ最小の trip。 */
function trip(tripId: string, departureTime: string): TripDetailsDto {
    return {
        tripId,
        times: [
            {
                timeId: `${tripId}-1`,
                stopSequence: 1,
                departureTime,
                departureDays: 1,
            },
        ],
        tripOperationLists: [],
    } as unknown as TripDetailsDto;
}

/** 運用の有無と、この先の列車（↪）の数 k を指定した 1 本。 */
function cell(options: {
    operation: boolean;
    k: number;
    id?: string;
}): TripDetailsDto {
    const self = trip(options.id ?? 'self', '06:00:00');
    const later = Array.from({ length: options.k }, (_, i) =>
        trip(`${options.id ?? 'self'}-later-${i}`, `07:${10 + i}:00`),
    );
    return {
        ...self,
        tripOperationLists: options.operation ? [{ operationId: 'op' }] : [],
        tripBlock: { tripBlockId: 'b', trips: [self, ...later] },
    } as unknown as TripDetailsDto;
}

/** 1 本の行 = セルの高さ + 格子の上下 16。 */
function oneRow(
    operation: boolean,
    k: number,
    showCurrentFormation: boolean,
): number {
    return estimateStationRowHeight(
        [cell({ operation, k })],
        showCurrentFormation,
    );
}

describe('estimateStationRowHeight', () => {
    describe('編成を出す（showCurrentFormation: true）', () => {
        it('運用あり + 編成: k=0 は 81 + 16', () => {
            expect(oneRow(true, 0, true)).toBe(97);
        });
        it('運用あり + 編成: k=1 は左の列 81 が勝つ', () => {
            expect(oneRow(true, 1, true)).toBe(97);
        });
        it('運用あり + 編成: k=2 は右の列 32 + 84 = 116 が勝つ', () => {
            expect(oneRow(true, 2, true)).toBe(132);
        });
        it('運用あり + 編成: k=4 は右の列 32 + 168 = 200', () => {
            expect(oneRow(true, 4, true)).toBe(216);
        });

        it('運用なし: k=0 は 36 + 16', () => {
            expect(oneRow(false, 0, true)).toBe(52);
        });
        it('運用なし: k=1 は右の列 32 + 42 = 74', () => {
            expect(oneRow(false, 1, true)).toBe(90);
        });
        it('運用なし: k=2 は右の列 116', () => {
            expect(oneRow(false, 2, true)).toBe(132);
        });
        it('運用なし: k=4 は右の列 200', () => {
            expect(oneRow(false, 4, true)).toBe(216);
        });
    });

    describe('編成を出さない（showCurrentFormation: false）', () => {
        it('運用あり: k=0 は 62 + 16', () => {
            expect(oneRow(true, 0, false)).toBe(78);
        });
        it('運用あり: k=1 は右の列 74 が勝つ', () => {
            expect(oneRow(true, 1, false)).toBe(90);
        });
        it('運用あり: k=2 は右の列 116', () => {
            expect(oneRow(true, 2, false)).toBe(132);
        });
        it('運用あり: k=4 は右の列 200', () => {
            expect(oneRow(true, 4, false)).toBe(216);
        });
        it('運用なし: k=0 は 36 + 16（編成の有無に関わらない）', () => {
            expect(oneRow(false, 0, false)).toBe(52);
        });
    });

    describe('本数', () => {
        it('0 本は格子の余白 16 だけ', () => {
            expect(estimateStationRowHeight([], true)).toBe(16);
        });

        it('3 本は セルの合計 + 間隔 4 × 2 + 16', () => {
            const trips = [
                cell({ operation: true, k: 0, id: 'a' }),
                cell({ operation: false, k: 0, id: 'b' }),
                cell({ operation: false, k: 2, id: 'c' }),
            ];
            // 81 + 36 + 116 + 8 + 16
            expect(estimateStationRowHeight(trips, true)).toBe(257);
        });

        it('tripOperationLists が無い列車は運用なしとして数える', () => {
            const noList = {
                ...cell({ operation: false, k: 0 }),
                tripOperationLists: undefined,
            } as unknown as TripDetailsDto;
            expect(estimateStationRowHeight([noList], true)).toBe(52);
        });
    });
});
