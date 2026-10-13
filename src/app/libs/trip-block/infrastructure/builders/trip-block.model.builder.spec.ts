import { CreateTripDto } from 'src/app/libs/trip/usecase/dtos/create-trip.dto';
import { ReplaceTripDto } from 'src/app/libs/trip/usecase/dtos/replace-trip.dto';
import { TripBlockModelBuilder } from './trip-block.model.builder';

const createTrip: CreateTripDto = {
    serviceId: 'service',
    tripNumber: '1001',
    tripClassId: 'local',
    tripName: '',
    tripDirection: 0,
    depotIn: false,
    depotOut: false,
    calendarId: 'calendar',
    extraCalendarId: null,
    times: [
        {
            stationId: 'a',
            stopId: null,
            stopSequence: 1,
            pickupType: 0,
            dropoffType: 1,
            arrivalDays: null,
            arrivalTime: null,
            departureDays: 1,
            departureTime: '05:01',
        },
    ],
    tripOperationLists: [
        {
            operationId: 'op-1',
            startStationId: 'a',
            endStationId: 'd',
            nextTripOperationListId: null,
        },
    ],
};

describe('TripBlockModelBuilder', () => {
    it('登録は ID をどの階層にも載せない', () => {
        const body = TripBlockModelBuilder.buildFromCreateDto({
            trips: [createTrip],
        });

        expect(JSON.stringify(body)).not.toMatch(
            /"id"|Id":"(trip|time|tol|block)/,
        );
        expect(body).toEqual({
            trips: [
                {
                    serviceId: 'service',
                    tripNumber: '1001',
                    tripClassId: 'local',
                    tripName: '',
                    tripDirection: 0,
                    depotIn: false,
                    depotOut: false,
                    calendarId: 'calendar',
                    extraCalendarId: null,
                    times: [
                        {
                            stationId: 'a',
                            stopId: null,
                            stopSequence: 1,
                            pickupType: 0,
                            dropoffType: 1,
                            arrivalDays: null,
                            arrivalTime: null,
                            departureDays: 1,
                            departureTime: '05:01',
                        },
                    ],
                    tripOperationLists: [
                        {
                            operationId: 'op-1',
                            startStationId: 'a',
                            endStationId: 'd',
                            nextTripOperationListId: null,
                        },
                    ],
                },
            ],
        });
    });

    it('コピー元の ID がフォームから紛れ込んでも、登録には載せない', () => {
        const polluted = {
            ...createTrip,
            tripId: 'trip-src',
            tripBlockId: 'block-src',
            times: [
                {
                    ...createTrip.times[0],
                    timeId: 'time-src',
                    tripId: 'trip-src',
                },
            ],
            tripOperationLists: [
                { ...createTrip.tripOperationLists[0], id: 'tol-src' },
            ],
        } as never;

        const body = TripBlockModelBuilder.buildFromCreateDto({
            trips: [polluted],
        });

        expect(JSON.stringify(body)).not.toMatch(/-src/);
    });

    it('更新はブロック・列車・時刻の xxxId を id にする', () => {
        const trip: ReplaceTripDto = {
            ...createTrip,
            tripId: 'trip-1',
            times: [{ ...createTrip.times[0], timeId: 'time-a' }],
            tripOperationLists: [
                { ...createTrip.tripOperationLists[0], id: 'tol-1' },
            ],
        };

        const body = TripBlockModelBuilder.buildFromReplaceDto({
            tripBlockId: 'block-1',
            trips: [trip],
        });

        expect(body.id).toBe('block-1');
        expect(body.trips[0].id).toBe('trip-1');
        expect(body.trips[0].times[0].id).toBe('time-a');
        expect(body.trips[0]).not.toHaveProperty('tripId');
        expect(body.trips[0].times[0]).not.toHaveProperty('timeId');
    });
});
