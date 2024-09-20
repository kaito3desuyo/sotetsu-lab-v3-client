import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';
import { TimetableStationService } from './timetable-station.service';
import { map, mergeMap } from 'rxjs/operators';
import { TimetableStationStateStore } from '../../timetable-station/states/timetable-station.state';

@Injectable()
export class TimetableStationResolverService {
    readonly #timetableStationService = inject(TimetableStationService);
    readonly #timetableStationStateStore = inject(TimetableStationStateStore);

    resolve(route: ActivatedRouteSnapshot): Observable<void> {
        const calendarId = route.paramMap.get('calendar_id');
        const stationId = route.paramMap.get('station_id');
        const tripDirection = route.paramMap.get('trip_direction') as '0' | '1';

        this.#timetableStationStateStore.setCalendarId(calendarId);
        this.#timetableStationStateStore.setStationId(stationId);
        this.#timetableStationStateStore.setTripDirection(+tripDirection);

        return forkJoin([
            this.#timetableStationService.fetchTrips(),
            this.#timetableStationService.fetchTripClasses(),
            this.#timetableStationService.fetchStations(),
            this.#timetableStationService.fetchOperations(),
        ]).pipe(
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
