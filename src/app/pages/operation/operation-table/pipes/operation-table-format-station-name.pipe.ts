import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'operationTableFormatStationName',
})
export class OperationTableFormatStationNamePipe implements PipeTransform {
    transform(stationName: string): string {
        if (stationName.length === 2) {
            return stationName[0] + '　' + stationName[1];
        } else if (stationName === '羽沢横浜国大') {
            return '羽沢横国';
        } else {
            return stationName;
        }
    }
}
