import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    standalone: true,
    name: 'operationTableFormatStationName',
})
export class OperationTableFormatStationNamePipe implements PipeTransform {
    transform(stationName: string): string {
        if (!stationName) {
            return '';
        }

        if (stationNameMap.has(stationName)) {
            return stationNameMap.get(stationName);
        }

        if (stationName.length === 2) {
            return stationName[0] + '　' + stationName[1];
        }

        return stationName;
    }
}

const stationNameMap = new Map<string, string>([
    ['羽沢横浜国大', '羽沢横国'],
    ['元町・中華街', '元町中華'],
]);
