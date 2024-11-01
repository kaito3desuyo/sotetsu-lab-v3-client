import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';
import { filter, first, map, mergeMap } from 'rxjs/operators';
import { TitleService } from 'src/app/core/services/title.service';
import { InitializeStateQuery } from 'src/app/global-states/initialize.state';
import { TimetableStationStateStore } from '../../timetable-station/states/timetable-station.state';
import { TimetableStationService } from './timetable-station.service';

@Injectable()
export class TimetableStationResolverService {
    readonly #titleService = inject(TitleService);
    readonly #initializeStateQuery = inject(InitializeStateQuery);
    readonly #timetableStationService = inject(TimetableStationService);
    readonly #timetableStationStateStore = inject(TimetableStationStateStore);

    resolve(route: ActivatedRouteSnapshot): Observable<void> {
        const title = route.data.title;
        const calendarId = route.paramMap.get('calendar_id');
        const stationId = route.paramMap.get('station_id');
        const tripDirection = route.paramMap.get('trip_direction') as '0' | '1';

        this.#titleService.setTitle(title);
        this.#timetableStationStateStore.setCalendarId(calendarId);
        this.#timetableStationStateStore.setStationId(stationId);
        this.#timetableStationStateStore.setTripDirection(+tripDirection);

        return of(undefined).pipe(
            mergeMap(() =>
                this.#initializeStateQuery.isInitialized$.pipe(
                    filter((bool) => !!bool),
                    first(),
                ),
            ),
            mergeMap(() =>
                forkJoin([
                    this.#timetableStationService.fetchTrips(),
                    this.#timetableStationService.fetchTripClasses(),
                    this.#timetableStationService.fetchStations(),
                    this.#timetableStationService.fetchOperations(),
                ]),
            ),
            mergeMap(() =>
                forkJoin([
                    this.#timetableStationService.fetchTripBlocks(),
                    this.#timetableStationService.fetchOperationSightingTimeCrossSections(),
                ]),
            ),
            map(() => undefined),
        );
    }
}
