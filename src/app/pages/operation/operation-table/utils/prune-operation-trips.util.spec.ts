import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { pruneOperationTrips } from './prune-operation-trips.util';

/** 実データに近い運用。各列車に時刻・種別などの重い項目を持たせる */
const operationTrip = (
    operationNumber: string,
    tripCount: number,
): OperationTripsDto =>
    ({
        operation: {
            operationId: `op-${operationNumber}`,
            operationNumber,
            calendarId: 'cal-1',
        },
        trips: Array.from({ length: tripCount }, (_, i) => ({
            tripOperationListId: `tol-${operationNumber}-${i}`,
            tripId: `t-${operationNumber}-${i}`,
            operationId: `op-${operationNumber}`,
            nextTripOperationListId: null,
            trip: {
                tripId: `t-${operationNumber}-${i}`,
                tripNumber: `${i}K`,
                tripDirection: i % 2,
                tripBlockId: 'b',
                tripClassId: 'c',
                depotIn: i === tripCount - 1,
                depotOut: i === 0,
                times: [{ timeId: 'x', stationId: 's' }],
            },
            startTime: { timeId: 'a', stationId: 's' },
            endTime: { timeId: 'b', stationId: 's' },
        })),
    }) as unknown as OperationTripsDto;

describe('pruneOperationTrips', () => {
    const sorted = ['11', '12', '13', '21', '22', '31'].map((n, i) =>
        operationTrip(n, i + 2),
    );

    it('先頭 keep 本の運用はそのまま返す', () => {
        const pruned = pruneOperationTrips(sorted, 4);

        expect(pruned.slice(0, 4)).toEqual(sorted.slice(0, 4));
    });

    it('残りの運用は運用を残し、列車の数と並びを保って 5 項目だけにする', () => {
        const pruned = pruneOperationTrips(sorted, 4);

        expect(pruned).toHaveLength(sorted.length);
        for (const [i, p] of pruned.slice(4).entries()) {
            const original = sorted[4 + i];
            expect(p.operation).toBe(original.operation);
            expect(p.trips).toHaveLength(original.trips.length);
            expect(p.trips[0]).toEqual({
                tripOperationListId: original.trips[0].tripOperationListId,
                trip: {
                    tripId: original.trips[0].trip?.tripId,
                    tripDirection: original.trips[0].trip?.tripDirection,
                    depotIn: original.trips[0].trip?.depotIn,
                    depotOut: original.trips[0].trip?.depotOut,
                },
            });
            expect(p.trips.map((t) => t.trip?.tripId)).toEqual(
                original.trips.map((t) => t.trip?.tripId),
            );
        }
    });

    it('元の配列は変えない', () => {
        const before = JSON.stringify(sorted);
        pruneOperationTrips(sorted, 4);

        expect(JSON.stringify(sorted)).toBe(before);
    });

    it('keep が運用の数以上なら何も削らない', () => {
        expect(pruneOperationTrips(sorted, 10)).toEqual(sorted);
    });
});
