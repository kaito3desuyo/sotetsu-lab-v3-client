import { Pipe, PipeTransform } from '@angular/core';
import { minBy } from 'es-toolkit/compat';

@Pipe({
    name: 'minBy',
})
export class MinByPipe implements PipeTransform {
    transform<T>(
        array: T[],
        options: { propertyName: keyof T },
    ): T | undefined {
        return minBy(array, (o) => o[options.propertyName]);
    }
}
