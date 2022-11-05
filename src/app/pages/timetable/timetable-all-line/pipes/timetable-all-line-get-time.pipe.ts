import { Pipe, PipeTransform } from '@angular/core';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { TimetableAllLineUtil } from '../utils/timetable-all-line.util';

@Pipe({
    name: 'timetableAllLineGetTime',
})
export class TimetableAllLineGetTimePipe implements PipeTransform {
    transform({
        tripDirection,
        mode,
        station,
        trip,
        stations,
        trips,
    }: {
        tripDirection: 0 | 1;
        mode: 'arrival' | 'departure';
        station: StationDetailsDto;
        trip: TripDetailsDto;
        stations: StationDetailsDto[];
        trips: TripDetailsDto[];
    }): string {
        return TimetableAllLineUtil.getTime({
            tripDirection,
            mode,
            station,
            trip,
            stations,
            trips,
        });
    }
}

@Pipe({
    name: 'timetableAllLineGetTimeAndTrackBy',
})
export class TimetableAllLineGetTimeAndTrackByPipe implements PipeTransform {
    transform({
        tripDirection,
        mode,
        station,
        stations,
        trips,
    }: {
        mode: 'arrival' | 'departure';
        station: StationDetailsDto;
        stations: StationDetailsDto[];
        trips: TripDetailsDto[];
        tripDirection: 0 | 1;
    }): (index: number, trip: TripDetailsDto) => string {
        return (index: number, trip: TripDetailsDto) => {
            return TimetableAllLineUtil.getTime({
                tripDirection,
                mode,
                station,
                trip,
                stations,
                trips,
            });
        };
    }
}
