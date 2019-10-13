import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';
import { TimetableAllLineService } from './timetable-all-line.service';
import { flatMap, map } from 'rxjs/operators';

@Injectable()
export class TimetableAllLineTableResolverService
  implements Resolve<Observable<void>> {
  constructor(private timetableAllLineService: TimetableAllLineService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<void> {
    const calendarId = route.paramMap.get('calendarId');
    const tripDirection = route.paramMap.get('trip_direction');

    this.timetableAllLineService.setCalendarId(calendarId);
    this.timetableAllLineService.setTripDirection(
      tripDirection === '0' || tripDirection === '1' ? tripDirection : null
    );

    return forkJoin([
      this.timetableAllLineService.fetchService().pipe(
        flatMap(() => this.timetableAllLineService.fetchStations()),
        map(() => null)
      ),
      this.timetableAllLineService.fetchTrips(),
      this.timetableAllLineService.fetchCalendar()
    ]).pipe(map(() => null));
  }
}