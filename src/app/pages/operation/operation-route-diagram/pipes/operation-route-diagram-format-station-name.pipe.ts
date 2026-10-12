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
            case '武蔵丘（信）':
                return '武蔵丘信';
            default:
                return stationName;
        }
    }
}
