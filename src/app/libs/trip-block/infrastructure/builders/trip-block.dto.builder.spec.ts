import { TripBlockModel } from '../models/trip-block.model';
import { TripBlockDtoBuilder } from './trip-block.dto.builder';

describe('TripBlockDtoBuilder', () => {
    // API の応答と同じ形の素の JSON（入れ子の列車・時刻・運用・種別を含む）
    const model = {
        id: 'block-1',
        createdAt: '2026-03-14T00:00:00.000Z',
        trips: [
            {
                id: 'trip-1',
                tripNumber: '6400',
                tripBlockId: 'block-1',
                times: [
                    {
                        id: 'time-1',
                        stationId: 'st-1',
                        departureTime: '05:00:00',
                    },
                ],
                tripOperationLists: [
                    {
                        id: 'tol-1',
                        operationId: 'op-1',
                        operation: { id: 'op-1', operationNumber: '58K' },
                    },
                ],
                tripClass: { id: 'class-1', tripClassName: '各停' },
            },
        ],
    } as TripBlockModel;

    it('すべての階層の id を xxxId に付け替える', () => {
        const dto = TripBlockDtoBuilder.buildFromModel(model);

        expect(dto.tripBlockId).toBe('block-1');
        expect(dto.createdAt).toBe('2026-03-14T00:00:00.000Z');
        const [trip] = dto.trips;
        expect(trip.tripId).toBe('trip-1');
        expect(trip.tripBlockId).toBe('block-1');
        expect(trip.times[0]).toEqual({
            timeId: 'time-1',
            stationId: 'st-1',
            departureTime: '05:00:00',
        });
        expect(trip.tripOperationLists[0]).toEqual({
            tripOperationListId: 'tol-1',
            operationId: 'op-1',
            operation: { operationId: 'op-1', operationNumber: '58K' },
        });
        expect(trip.tripClass).toEqual({
            tripClassId: 'class-1',
            tripClassName: '各停',
        });
        expect(JSON.stringify(dto)).not.toMatch(/"id":/);
    });

    it('fields で絞った trip-blocks（時刻に id が無い）でも落ちない', () => {
        const dto = TripBlockDtoBuilder.buildFromModel({
            id: 'block-1',
            trips: [
                {
                    id: 'trip-1',
                    times: [{ stationId: 'st-1', departureTime: '05:00' }],
                },
            ],
        } as TripBlockModel);

        expect(dto.trips[0].times[0]).toEqual({
            timeId: undefined,
            stationId: 'st-1',
            departureTime: '05:00',
        });
        expect(dto.trips[0].tripOperationLists).toBeUndefined();
    });
});
