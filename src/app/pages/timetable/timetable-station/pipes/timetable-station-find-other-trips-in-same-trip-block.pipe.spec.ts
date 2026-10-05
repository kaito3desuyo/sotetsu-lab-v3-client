import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { TimetableStationFindOtherTripsInSameTripBlockPipe } from './timetable-station-find-other-trips-in-same-trip-block.pipe';

/** 始発駅の発車だけを持つ最小の trip。 */
function trip(
    tripId: string,
    departureTime: string | null,
    departureDays = 1,
): TripDetailsDto {
    return {
        tripId,
        times: departureTime
            ? [
                  {
                      timeId: `${tripId}-1`,
                      stopSequence: 1,
                      departureTime,
                      departureDays,
                  },
              ]
            : [],
    } as TripDetailsDto;
}

function withBlock(self: TripDetailsDto, trips: TripDetailsDto[]) {
    return {
        ...self,
        tripBlock: { tripBlockId: 'b', trips: [self, ...trips] },
    } as TripDetailsDto;
}

describe('TimetableStationFindOtherTripsInSameTripBlockPipe', () => {
    const pipe = new TimetableStationFindOtherTripsInSameTripBlockPipe();
    const ids = (trips: TripDetailsDto[]) => trips.map((t) => t.tripId);

    it('この列車より後に出る列車だけを返す（前の区間は返さない）', () => {
        const self = trip('self', '06:20:00');
        const before = trip('before', '05:50:00');
        const after = trip('after', '07:10:00');

        expect(ids(pipe.transform(withBlock(self, [before, after])))).toEqual([
            'after',
        ]);
    });

    it('0 時をまたぐ運行は繰り越し日数で前後を判定する', () => {
        const self = trip('self', '23:50:00', 1);
        const afterMidnight = trip('after-midnight', '00:20:00', 2);
        const earlierSameDay = trip('earlier', '23:10:00', 1);

        expect(
            ids(
                pipe.transform(
                    withBlock(self, [afterMidnight, earlierSameDay]),
                ),
            ),
        ).toEqual(['after-midnight']);
    });

    it('時刻が取れない列車は前後を判定できないので残す', () => {
        const self = trip('self', '06:20:00');
        const unknown = trip('unknown', null);

        expect(ids(pipe.transform(withBlock(self, [unknown])))).toEqual([
            'unknown',
        ]);
    });

    it('始発駅に発車時刻が無ければ到着時刻で比べる', () => {
        const self = trip('self', '06:20:00');
        const arrivalOnly = {
            tripId: 'arrival-only',
            times: [
                {
                    timeId: 'a-1',
                    stopSequence: 1,
                    arrivalTime: '06:40:00',
                    arrivalDays: 1,
                },
            ],
        } as TripDetailsDto;

        expect(ids(pipe.transform(withBlock(self, [arrivalOnly])))).toEqual([
            'arrival-only',
        ]);
    });

    it('tripBlock が無ければ空', () => {
        expect(pipe.transform(trip('self', '06:20:00'))).toEqual([]);
    });
});
