import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';
import { TimetableAllLineService } from './timetable-all-line.service';
import { flatMap, tap, map } from 'rxjs/operators';
import { ServiceModel } from 'src/app/general/models/service/service-model';

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
        flatMap(() => {
          const service = this.timetableAllLineService.getServiceAsStatic();
          return this.timetableAllLineService.fetchStations(
            service.id,
            this.timetableAllLineService.getTripDirectionAsStatic()
          );
        }),
        map(() => null)
      ),
      this.timetableAllLineService.fetchTrips(
        this.timetableAllLineService.getCalendarIdAsStatic(),
        this.timetableAllLineService.getTripDirectionAsStatic()
      ),
      this.timetableAllLineService.fetchCalendar(
        this.timetableAllLineService.getCalendarIdAsStatic()
      )
    ]).pipe(map(() => null));
  }
}
