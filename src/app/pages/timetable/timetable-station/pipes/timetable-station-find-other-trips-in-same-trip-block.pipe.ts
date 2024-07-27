import { Pipe, PipeTransform } from '@angular/core';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';

@Pipe({
    standalone: true,
    name: 'timetableStationFindOtherTripsInSameTripBlock',
})
export class TimetableStationFindOtherTripsInSameTripBlockPipe
    implements PipeTransform
{
    transform(trip: TripDetailsDto): TripDetailsDto[] {
        return trip.tripBlock.trips.filter((o) => o.tripId !== trip.tripId);
    }
}
