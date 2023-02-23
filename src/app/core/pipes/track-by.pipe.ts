import { Pipe, PipeTransform } from '@angular/core';
import has from 'just-has';
import get from 'just-safe-get';
import set from 'just-safe-set';
import { NGXLogger } from 'ngx-logger';

interface TrackByFunctionCache {
    [propertyName: string]: <T>(index: number, item: T) => any;
}

const cache: TrackByFunctionCache = Object.create(null);

@Pipe({
    name: 'trackBy',
})
export class TrackByPipe implements PipeTransform {
    constructor(private readonly logger: NGXLogger) {}

    transform(
        propertyName: string | 'this'
    ): <T>(index: number, item: T) => any {
        this.logger.debug(`Getting track-by for [${propertyName}].`);

        if (!has(cache, propertyName)) {
            set(cache, propertyName, function trackByProperty<
                T
            >(index: number, item: T): any {
                if (propertyName === 'this') {
                    return item;
                }

                return get(item, propertyName);
            });
        }

        return get(cache, propertyName);
    }
}
