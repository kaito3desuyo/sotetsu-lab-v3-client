import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TitleService } from 'src/app/core/services/title.service';
import { OperationRealTimeService } from './operation-real-time.service';

@Injectable()
export class OperationRealTimeResolverService {
    readonly #titleService = inject(TitleService);
    readonly #operationRealTimeService = inject(OperationRealTimeService);

    resolve(route: ActivatedRouteSnapshot): Observable<void> {
        const title = route.data.title;
        this.#titleService.setTitle(title);

        return forkJoin([
            // v2
            this.#operationRealTimeService.fetchOperationSightingTimeCrossSections(),
            this.#operationRealTimeService.fetchFormationSightingTimeCrossSections(),
            this.#operationRealTimeService.fetchOperationSightingHistories(),
            this.#operationRealTimeService.fetchFormationSightingHistories(),
            this.#operationRealTimeService.fetchOperationCurrentPosition(),
            this.#operationRealTimeService.fetchTripClassesV2(),
        ]).pipe(map(() => undefined));
    }
}
