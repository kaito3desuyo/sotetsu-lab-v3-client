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
        if (!value || !setting.array || !setting.propertyName) return undefined;

        if (!setting.outputPropertyName) {
            const obj = setting.array.find(
                (o) => o[setting.propertyName] === value
            );

            if (!obj) return undefined;

            return obj;
        }

        if (setting.outputPropertyName === 'index') {
            const idx = setting.array.findIndex(
                (o) => o[setting.propertyName] === value
            );

            if (idx === -1) return undefined;

            return idx;
        }

        const obj = setting.array.find(
            (o) => o[setting.propertyName] === value
        );

        if (!obj) return undefined;

        return obj[setting.outputPropertyName];
    }
}
