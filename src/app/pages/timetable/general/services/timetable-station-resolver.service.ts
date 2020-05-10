import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';
import { TimetableStationService } from './timetable-station.service';
import { map } from 'rxjs/operators';

@Injectable()
export class TimetableStationResolverService
    implements Resolve<Observable<void>> {
    constructor(private timetableStationService: TimetableStationService) {}

    resolve(route: ActivatedRouteSnapshot): Observable<void> {
        const calendarId = route.paramMap.get('calendar_id');
        const stationId = route.paramMap.get('station_id');
        const tripDirection = route.paramMap.get('trip_direction') as '0' | '1';

        this.timetableStationService.setCalendarId(calendarId);
        this.timetableStationService.setStationId(stationId);
        this.timetableStationService.setTripDirection(tripDirection);

        return forkJoin([
            this.timetableStationService.fetchCalendar(),
            this.timetableStationService.fetchStations(),
            this.timetableStationService.fetchTimes(),
            this.timetableStationService.fetchOperationSightings(),
        ]).pipe(map(() => null));
    }
}
