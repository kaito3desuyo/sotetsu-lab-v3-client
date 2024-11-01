import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';
import { filter, first, map, mergeMap } from 'rxjs/operators';
import { TitleService } from 'src/app/core/services/title.service';
import { InitializeStateQuery } from 'src/app/global-states/initialize.state';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { TimetableEditFormService } from 'src/app/shared/timetable-edit-form/services/timetable-edit-form.service';
import { ETimetableEditFormMode } from 'src/app/shared/timetable-edit-form/special/enums/timetable-edit-form.enum';
import { TimetableEditFormStateStore } from 'src/app/shared/timetable-edit-form/states/timetable-edit-form.state';

@Injectable()
export class TimetableAddResolverService {
    readonly #titleService = inject(TitleService);
    readonly #initializeStateQuery = inject(InitializeStateQuery);
    readonly #timetableEditFormService = inject(TimetableEditFormService);
    readonly #timetableEditFormStateStore = inject(TimetableEditFormStateStore);

    resolve(route: ActivatedRouteSnapshot): Observable<void> {
        const title = route.data.title;
        const calendarId = route.paramMap.get('calendarId');
        const tripDirection = route.paramMap.get('trip_direction') as '0' | '1';

        this.#titleService.setTitle(title);
        this.#timetableEditFormStateStore.setCalendarId(calendarId);
        this.#timetableEditFormStateStore.setMode(ETimetableEditFormMode.ADD);
        this.#timetableEditFormStateStore.setTripDirection(
            +tripDirection as ETripDirection,
        );

        return of(undefined).pipe(
            mergeMap(() =>
                this.#initializeStateQuery.isInitialized$.pipe(
                    filter((bool) => !!bool),
                    first(),
                ),
            ),
            mergeMap(() =>
                forkJoin([
                    this.#timetableEditFormService.fetchStations(),
                    this.#timetableEditFormService.fetchOperations(),
                    this.#timetableEditFormService.fetchTripClasses(),
                ]),
            ),
            map(() => undefined),
        );
    }
}
