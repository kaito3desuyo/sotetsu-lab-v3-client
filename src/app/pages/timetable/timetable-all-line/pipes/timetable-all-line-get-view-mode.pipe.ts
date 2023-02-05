import { Pipe, PipeTransform } from '@angular/core';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { ETimetableAllLineStationViewMode } from '../interfaces/timetable-all-line.interface';
import { TimetableAllLineUtil } from '../utils/timetable-all-line.util';

@Pipe({
    name: 'timetableAllLineGetViewMode',
})
export class TimetableAllLineGetViewModePipe implements PipeTransform {
    transform({
        station,
        tripDirection,
    }: {
        station: StationDetailsDto;
        tripDirection: 0 | 1;
    }): ETimetableAllLineStationViewMode {
        return TimetableAllLineUtil.getViewMode(station, tripDirection);
    }
}
