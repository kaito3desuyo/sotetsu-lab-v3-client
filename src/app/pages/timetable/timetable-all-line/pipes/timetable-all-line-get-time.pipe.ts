import { Pipe, PipeTransform } from '@angular/core';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripWithTimesDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { ETimetableAllLineStationViewMode } from '../enums/timetable-all-line.enum';
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
        previousTrip,
        viewModes,
        bordersAfter,
    }: {
        tripDirection: 0 | 1;
        mode: 'arrival' | 'departure';
        station: StationDetailsDto;
        trip: TripWithTimesDto;
        stations: StationDetailsDto[];
        previousTrip?: TripWithTimesDto;
        viewModes: ReadonlyMap<string, ETimetableAllLineStationViewMode>;
        bordersAfter: ReadonlyMap<string, boolean>;
    }): string | undefined {
        return TimetableAllLineUtil.getTime({
            tripDirection,
            mode,
            station,
            trip,
            stations,
            previousTrip,
            viewModes,
            bordersAfter,
        });
    }
}
