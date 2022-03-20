import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'operationTableFormatTripClassName',
})
export class OperationTableFormatTripClassNamePipe implements PipeTransform {
    transform(tripClassName: string): string {
        switch (tripClassName) {
            case '通勤特急':
                return '通特';
            case '通勤急行':
                return '通急';
            case '直通特急':
                return '直特';
            case '直通各停':
                return '直各';
            case '通勤快速':
                return '通快';
            case '各駅停車':
                return '各停';
            default:
                return tripClassName;
        }
    }
}
