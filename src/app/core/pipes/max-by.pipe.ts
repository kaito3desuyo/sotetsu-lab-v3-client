import { Pipe, PipeTransform } from '@angular/core';
import { maxBy } from 'lodash-es';

@Pipe({
    name: 'maxBy',
    standalone: false
})
export class MaxByPipe implements PipeTransform {
    transform<T>(array: T[], options: { propertyName: keyof T }): T {
        return maxBy(array, (o) => o[options.propertyName]);
    }
}
