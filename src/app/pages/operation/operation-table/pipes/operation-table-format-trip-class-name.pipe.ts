import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    standalone: true,
    name: 'operationTableFormatTripClassName',
})
export class OperationTableFormatTripClassNamePipe implements PipeTransform {
    transform(tripClassName: string): string {
        if (tripClassNameMap.has(tripClassName)) {
            return tripClassNameMap.get(tripClassName);
        }

        return tripClassName;
    }
}

const tripClassNameMap = new Map<string, string>([
    ['F快速急行', 'F快急'],
    ['快速急行', '快急'],
    ['各駅停車', '各停'],
]);
