import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'range'
})
export class RangePipe implements PipeTransform {
    transform(value: number): Array<number> {
        return Array(value);
    }
}
