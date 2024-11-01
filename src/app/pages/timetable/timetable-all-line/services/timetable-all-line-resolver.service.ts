import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';
import { filter, first, map, mergeMap } from 'rxjs/operators';
import { TitleService } from 'src/app/core/services/title.service';
import { InitializeStateQuery } from 'src/app/global-states/initialize.state';
import {
    TimetableAllLineStateQuery,
    TimetableAllLineStateStore,
} from '../states/timetable-all-line.state';
import { TimetableAllLineService } from './timetable-all-line.service';

@Injectable()
export class TimetableAllLineResolverService {
    readonly #titleService = inject(TitleService);
    readonly #initializeStateQuery = inject(InitializeStateQuery);
    readonly #timetableAllLineService = inject(TimetableAllLineService);
    readonly #timetableAllLineStateStore = inject(TimetableAllLineStateStore);
    readonly #timetableAllLineStateQuery = inject(TimetableAllLineStateQuery);

    resolve(route: ActivatedRouteSnapshot): Observable<void> {
        const title = route.data.title;
        const calendarId = route.paramMap.get('calendar_id');
        const tripDirection = +route.paramMap.get('trip_direction');
        const tripBlockId = route.paramMap.get('trip_block_id');

        const prevCalendarId = this.#timetableAllLineStateQuery.calendarId;
        const prevTripDirection =
            this.#timetableAllLineStateQuery.tripDirection;
        const prevTripBlockId = this.#timetableAllLineStateQuery.tripBlockId;

        this.#titleService.setTitle(title);

        if (
            calendarId !== prevCalendarId ||
            tripDirection !== prevTripDirection ||
            tripBlockId !== prevTripBlockId
        ) {
            this.#timetableAllLineStateStore.updatePageSettings({
                pageIndex: 0,
            });
        }

        this.#timetableAllLineStateStore.setCalendarId(calendarId);
        this.#timetableAllLineStateStore.setTripDirection(tripDirection);
        this.#timetableAllLineStateStore.setTripBlockId(tripBlockId ?? null);

        return of(undefined).pipe(
            mergeMap(() =>
                this.#initializeStateQuery.isInitialized$.pipe(
                    filter((bool) => !!bool),
                    first(),
                ),
            ),
            mergeMap(() =>
                forkJoin([
                    this.#timetableAllLineService.fetchStationsV2(),
                    this.#timetableAllLineService.fetchTripBlocksV2(),
                ]),
            ),
            map(() => undefined),
        );
    }
}
