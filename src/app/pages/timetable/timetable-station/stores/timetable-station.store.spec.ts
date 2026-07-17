import { firstValueFrom } from 'rxjs';
import { TimetableStationFindOtherTripsInSameTripBlockPipe } from '../pipes/timetable-station-find-other-trips-in-same-trip-block.pipe';
import { TimetableStationStore } from './timetable-station.store';

const trip6436 = {
    tripId: 'trip-6436',
    tripNumber: '6436',
    tripDirection: 0,
    tripBlockId: 'block-1',
    times: [
        {
            stationId: 'yokohama',
            stopSequence: 10,
            arrivalTime: '06:45:00',
            arrivalDays: 1,
        },
    ],
    tripOperationLists: [],
} as never;

const tripBlock1 = {
    tripBlockId: 'block-1',
    trips: [
        {
            tripId: 'trip-9436',
            tripNumber: '9436',
            times: [
                {
                    stationId: 'kashiwadai',
                    stopSequence: 1,
                    departureTime: '05:50:00',
                    departureDays: 1,
                },
            ],
        },
        trip6436,
    ],
} as never;

describe('TimetableStationStore', () => {
    it('timetableData$ の trip に tripBlock（他列車込み）が付与される', async () => {
        TimetableStationStore.setStationId('yokohama');
        TimetableStationStore.setTrips([trip6436]);
        TimetableStationStore.setTripBlocks([tripBlock1]);

        const data = await firstValueFrom(
            TimetableStationStore.timetableData$,
        );

        expect(data).toHaveLength(1);
        expect(data[0].hour).toBe('6');

        const trip = data[0].trips[0];
        const others =
            new TimetableStationFindOtherTripsInSameTripBlockPipe().transform(
                trip,
            );

        expect(others).toHaveLength(1);
        expect(others[0].tripNumber).toBe('9436');
    });
});
