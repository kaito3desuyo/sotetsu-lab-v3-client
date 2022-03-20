import { Pipe, PipeTransform } from '@angular/core';
import { get, has, set } from 'lodash-es';
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

    transform(propertyName: string): <T>(index: number, item: T) => any {
        this.logger.debug(`Getting track-by for [${propertyName}].`);

        if (!has(cache, propertyName)) {
            set(cache, propertyName, function trackByProperty<
                T
            >(index: number, item: T): any {
                return get(item, propertyName);
            });
        }

        return get(cache, propertyName);
    }
}
