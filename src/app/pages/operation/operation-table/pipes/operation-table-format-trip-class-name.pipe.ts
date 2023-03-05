import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'operationTableFormatTripClassName',
})
export class OperationTableFormatTripClassNamePipe implements PipeTransform {
    transform(tripClassName: string): string {
        if (tripClassName.length === 4) {
            return tripClassName[0] + tripClassName[2];
        }

        return tripClassName;
    }
}
