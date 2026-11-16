import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { pruneAllLineTripBlocks } from './prune-all-line-trip-blocks.util';

const block = (id: string, tripCount = 1): TripBlockDetailsDto =>
    ({
        tripBlockId: id,
        trips: Array.from({ length: tripCount }, (_, i) => ({
            tripId: `${id}-${i}`,
            tripBlockId: id,
            times: [{ timeId: `${id}-${i}-t`, stationId: 's1' }],
        })),
    }) as unknown as TripBlockDetailsDto;

describe('pruneAllLineTripBlocks', () => {
    it('並べた順の先頭から pageSize 本ぶんの運行を、中身を削らずに返す', () => {
        const sorted = Array.from({ length: 25 }, (_, i) => block(`b${i}`));

        const result = pruneAllLineTripBlocks(sorted, 10);

        expect(result.map((b) => b.tripBlockId)).toEqual(
            sorted.slice(0, 10).map((b) => b.tripBlockId),
        );
        expect(result[0]).toBe(sorted[0]);
    });

    it('1 つの運行に列車が複数あるときは、pageSize 本に届く運行までを残す', () => {
        const sorted = [
            block('a', 4),
            block('b', 4),
            block('c', 4),
            block('d'),
        ];

        expect(
            pruneAllLineTripBlocks(sorted, 10).map((b) => b.tripBlockId),
        ).toEqual(['a', 'b', 'c']);
    });

    it('絞り込みで隠れる列車は数えず、列に出る列車を持たない運行は落とす', () => {
        const sorted = [
            block('hidden1'),
            block('x1'),
            block('hidden2'),
            block('x2'),
        ];
        const isListed = (trip: { tripBlockId?: string }) =>
            trip.tripBlockId?.startsWith('x');

        expect(
            pruneAllLineTripBlocks(sorted, 2, isListed).map(
                (b) => b.tripBlockId,
            ),
        ).toEqual(['x1', 'x2']);
    });

    it('全体が pageSize より少なければ全部返す', () => {
        const sorted = [block('a'), block('b')];

        expect(pruneAllLineTripBlocks(sorted, 10)).toHaveLength(2);
    });
});
