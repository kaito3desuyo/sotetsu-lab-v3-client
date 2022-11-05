import { Pipe, PipeTransform } from '@angular/core';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { ETimetableStationViewMode } from '../../general/interfaces/timetable-station';
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
    }): ETimetableStationViewMode {
        return TimetableAllLineUtil.getViewMode(station, tripDirection);
    }
}
