import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { filter, first, map, mergeMap } from 'rxjs/operators';
import { TitleService } from 'src/app/core/services/title.service';
import { InitializeStateQuery } from 'src/app/global-states/initialize.state';
import { OperationRealTimeStore } from '../stores/operation-real-time.store';

@Injectable()
export class OperationRealTimeResolverService {
    readonly #titleService = inject(TitleService);
    readonly #initializeStateQuery = inject(InitializeStateQuery);

    resolve(route: ActivatedRouteSnapshot): Observable<void> {
        const title = route.data.title;

        this.#titleService.setTitle(title);

        return of(undefined).pipe(
            mergeMap(() =>
                this.#initializeStateQuery.isInitialized$.pipe(
                    filter((bool) => !!bool),
                    first(),
                ),
            ),
            mergeMap(() => OperationRealTimeStore.persistInitialized$),
            map(() => undefined),
        );
    }
}
