import { Pipe, PipeTransform } from '@angular/core';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TimetableAllLineUtil } from '../utils/timetable-all-line.util';

@Pipe({
    name: 'timetableAllLineGetBorderSetting',
})
export class TimetableAllLineGetBorderSettingPipe implements PipeTransform {
    transform({
        station,
        tripDirection,
    }: {
        station: StationDetailsDto;
        tripDirection: 0 | 1;
    }): boolean {
        return TimetableAllLineUtil.getBorderSetting(station, tripDirection);
    }
}
