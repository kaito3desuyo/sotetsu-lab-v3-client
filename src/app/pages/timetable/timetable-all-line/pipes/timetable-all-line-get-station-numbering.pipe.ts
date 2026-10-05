import { Pipe, PipeTransform } from '@angular/core';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';

@Pipe({
    standalone: true,
    name: 'timetableAllLineGetStationNumbering',
})
/**
 * 駅の所属路線ごとの駅番号（重複を除いて昇順）。表では 1 つずつ縦に積むので配列で返す。
 */
export class TimetableAllLineGetStationNumberingPipe implements PipeTransform {
    transform(station: StationDetailsDto): string[] {
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
                .sort() ?? []
        );
    }
}
