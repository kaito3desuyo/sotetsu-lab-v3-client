import { TripBlockDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-block-details.dto';
import { filterTripBlocksByDirection } from './filter-trip-blocks-by-direction.util';

function block(id: string): TripBlockDetailsDto {
    return { tripBlockId: id, trips: [] } as unknown as TripBlockDetailsDto;
}

describe('filterTripBlocksByDirection', () => {
    const tripBlocksByDirection: Record<number, TripBlockDetailsDto[]> = {
        0: [block('inbound-1')],
        1: [block('outbound-1')],
    };

    it("'both' は全キー（元の Record）を返す", () => {
        expect(
            filterTripBlocksByDirection(tripBlocksByDirection, 'both'),
        ).toBe(tripBlocksByDirection);
    });

    it("'up' は INBOUND(0) のキーのみ残す", () => {
        const result = filterTripBlocksByDirection(tripBlocksByDirection, 'up');
        expect(Object.keys(result)).toEqual(['0']);
        expect(result[0]).toBe(tripBlocksByDirection[0]);
    });

    it("'down' は OUTBOUND(1) のキーのみ残す", () => {
        const result = filterTripBlocksByDirection(
            tripBlocksByDirection,
            'down',
        );
        expect(Object.keys(result)).toEqual(['1']);
        expect(result[1]).toBe(tripBlocksByDirection[1]);
    });

    it('対象方向のキーが無い場合は空 Record を返す', () => {
        const inboundOnly: Record<number, TripBlockDetailsDto[]> = {
            0: [block('inbound-1')],
        };
        expect(filterTripBlocksByDirection(inboundOnly, 'down')).toEqual({});
    });

    it('空の Record はそのまま空を返す', () => {
        expect(filterTripBlocksByDirection({}, 'up')).toEqual({});
    });
});
