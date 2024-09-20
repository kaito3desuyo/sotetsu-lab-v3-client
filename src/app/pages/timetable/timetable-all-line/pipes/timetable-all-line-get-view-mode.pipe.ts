import { Pipe, PipeTransform } from '@angular/core';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { ETimetableAllLineStationViewMode } from '../enums/timetable-all-line.enum';
import { TimetableAllLineUtil } from '../utils/timetable-all-line.util';

@Pipe({
    standalone: true,
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
