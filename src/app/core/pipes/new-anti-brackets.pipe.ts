import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'newAntiBrackets',
})
export class NewAntiBracketsPipe implements PipeTransform {
    transform(str: string): string {
        return str ? str.replace(/（[^（）]*）/g, '') : '';
    }
}
