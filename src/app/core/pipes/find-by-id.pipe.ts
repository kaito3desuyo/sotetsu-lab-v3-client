import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'findById',
})
export class FindByIdPipe implements PipeTransform {
    transform<T>(id: string, array: T[], propertyName: string): T {
        return array.find((o) => o[propertyName] === id);
    }
}
