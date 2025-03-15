import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'antiBrackets',
    standalone: false
})
export class AntiBracketsPipe implements PipeTransform {
    transform(str: string): string {
        return str ? str.replace(/（[^（）]*）/g, '') : '';
    }
}
