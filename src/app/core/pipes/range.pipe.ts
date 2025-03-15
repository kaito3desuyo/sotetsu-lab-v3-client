import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'range',
    standalone: false
})
export class RangePipe implements PipeTransform {
    transform(value: number): Array<number> {
        return Array(value);
    }
}
