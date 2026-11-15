import { Pipe, PipeTransform } from '@angular/core';

const padding = (str: string, num: number, pad: string) => {
    if (!pad) {
        pad = '　';
    }
    return (Array(num + 1).join(pad) + str).slice(num * -1);
};

@Pipe({
    name: 'padding',
})
export class PaddingPipe implements PipeTransform {
    transform(value: string, args: { num: number; pad?: string }): string {
        return padding(value, args.num, args.pad);
    }
}
