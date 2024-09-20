import { Pipe, PipeTransform } from '@angular/core';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';

@Pipe({
    standalone: true,
    name: 'timetableAllLineGetStationNumbering',
})
export class TimetableAllLineGetStationNumberingPipe implements PipeTransform {
    transform(station: StationDetailsDto): string {
        const valueSet = new Set<string>();

        return (
            station.routeStationLists
                ?.filter((o) => !!o.stationNumbering)
                .map((o) => o.stationNumbering)
                .filter((value) => {
                    if (valueSet.has(value)) {
                        return false;
                    }
                    valueSet.add(value);
                    return true;
                })
                .sort()
                .join('/') ?? ''
        );
    }
}
