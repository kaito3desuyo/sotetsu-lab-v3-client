import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'findById',
})
export class FindByIdPipe implements PipeTransform {
    transform<T>(id: string, setting: { array: T[]; propertyName: string }): T {
        return setting.array.find((o) => o[setting.propertyName] === id);
    }
}
