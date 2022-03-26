import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';
import { TimetableStationService } from './timetable-station.service';
import { map } from 'rxjs/operators';
import { TimetableStationStateStore } from '../../timetable-station/states/timetable-station.state';

@Injectable()
export class TimetableStationResolverService
    implements Resolve<Observable<void>>
{
    constructor(
        private readonly timetableStationService: TimetableStationService,
        private readonly timetableStationStateStore: TimetableStationStateStore
    ) {}

    resolve(route: ActivatedRouteSnapshot): Observable<void> {
        const calendarId = route.paramMap.get('calendar_id');
        const stationId = route.paramMap.get('station_id');
        const tripDirection = route.paramMap.get('trip_direction') as '0' | '1';

        this.timetableStationStateStore.setCalendarId(calendarId);
        this.timetableStationStateStore.setStationId(stationId);
        this.timetableStationStateStore.setTripDirection(+tripDirection);

        return forkJoin([
            this.timetableStationService.fetchTripsV2(),
            this.timetableStationService.fetchTripClassesV2(),
            this.timetableStationService.fetchStationsV2(),
        ]).pipe(map(() => null));
    }
}
