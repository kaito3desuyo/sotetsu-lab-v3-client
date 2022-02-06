import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'findById',
})
export class FindByIdPipe implements PipeTransform {
    transform<T>(
        value: T[keyof T],
        setting: { array: T[]; propertyName: keyof T }
    ): T;
    transform<T>(
        value: T[keyof T],
        setting: {
            array: T[];
            propertyName: keyof T;
            outputPropertyName: keyof T;
        }
    ): T[keyof T];
    transform<T>(
        value: T[keyof T],
        setting: {
            array: T[];
            propertyName: keyof T;
            outputPropertyName?: never | keyof T;
        }
    ): T | T[keyof T] {
        const obj = setting.array.find(
            (o) => o[setting.propertyName] === value
        );
        return setting.outputPropertyName
            ? obj[setting.outputPropertyName]
            : obj;
    }
}
