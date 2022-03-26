import { Pipe, PipeTransform } from '@angular/core';
import dayjs from 'dayjs';
import { minBy } from 'lodash-es';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';

@Pipe({
    name: 'timetableStationFindOtherTripsInSameTripBlock',
})
export class TimetableStationFindOtherTripsInSameTripBlockPipe
    implements PipeTransform
{
    transform(trip: TripDetailsDto): TripDetailsDto[] {
        return trip.tripBlock.trips
            .filter((o) => o.tripId !== trip.tripId)
            .sort((a, b) => {
                const aTime = minBy(a.times, (o2) => o2.stopSequence);
                const bTime = minBy(b.times, (o2) => o2.stopSequence);
                const format = 'HH:mm:ss';
                return (
                    dayjs(aTime.departureTime, format)
                        .add(aTime.departureDays - 1, 'days')
                        .unix() -
                    dayjs(bTime.departureTime, format)
                        .add(bTime.departureDays - 1, 'days')
                        .unix()
                );
            });
    }
}
