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
            outputPropertyName: 'index';
        }
    ): number;
    transform<T>(
        value: T[keyof T],
        setting: {
            array: T[];
            propertyName: keyof T;
            outputPropertyName?: never | keyof T | 'index';
        }
    ): T | T[keyof T] | number {
        const obj = setting.array.find(
            (o) => o[setting.propertyName] === value
        );
        const idx = setting.array.findIndex(
            (o) => o[setting.propertyName] === value
        );

        return setting.outputPropertyName &&
            setting.outputPropertyName === 'index'
            ? idx
            : setting.outputPropertyName &&
              setting.outputPropertyName !== 'index'
            ? obj[setting.outputPropertyName]
            : obj;
    }
}
