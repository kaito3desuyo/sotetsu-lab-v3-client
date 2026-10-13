import { TripModel } from '../models/trip.model';
import { TimeDtoBuilder } from './time.dto.builder';
import { TripOperationListDtoBuilder } from './trip-operation-list.dto.builder';
import { TripDtoBuilder } from './trip.dto.builder';

describe('TripDtoBuilder', () => {
    it('列車が属するブロックの id も付け替える', () => {
        const dto = TripDtoBuilder.buildFromModel({
            id: 'trip-1',
            tripBlock: { id: 'block-1' },
        } as TripModel);

        expect(dto.tripId).toBe('trip-1');
        expect(dto.tripBlock).toEqual({ tripBlockId: 'block-1' });
    });
});

describe('TimeDtoBuilder', () => {
    it('時刻の駅・のりば・区間の入れ子を付け替える', () => {
        const dto = TimeDtoBuilder.buildFromModel({
            id: 'time-1',
            station: { id: 'st-1', stationName: '横浜' },
            stop: { id: 'stop-1', stationId: 'st-1' },
            startTripOperationLists: [{ id: 'tol-1' }],
            endTripOperationLists: [],
        } as never);

        expect(dto.timeId).toBe('time-1');
        expect(dto.station).toEqual({ stationId: 'st-1', stationName: '横浜' });
        expect(dto.stop).toEqual({ stopId: 'stop-1', stationId: 'st-1' });
        expect(dto.startTripOperationLists).toEqual([
            { tripOperationListId: 'tol-1' },
        ]);
        expect(dto.endTripOperationLists).toEqual([]);
    });
});

describe('TripOperationListDtoBuilder', () => {
    it('運用が null のときは null のまま', () => {
        const dto = TripOperationListDtoBuilder.buildFromModel({
            id: 'tol-1',
            operation: null,
            startTime: { id: 'time-1' },
        } as never);

        expect(dto.tripOperationListId).toBe('tol-1');
        expect(dto.operation).toBeNull();
        expect(dto.startTime).toEqual({ timeId: 'time-1' });
    });
});
