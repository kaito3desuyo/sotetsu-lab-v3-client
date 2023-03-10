import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'operationRouteDiagramFormatStationName',
})
export class OperationRouteDiagramFormatStationNamePipe
    implements PipeTransform
{
    transform(stationName: string): unknown {
        switch (stationName) {
            case '元町・中華街':
                return '元町中華街';
            case '東京テレポート':
                return '東京テレポ';
            default:
                return stationName;
        }
    }
}
