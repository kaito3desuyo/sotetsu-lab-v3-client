import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';
import { TimetableAddService } from './timetable-add.service';
import { map, flatMap } from 'rxjs/operators';
import { TimetableEditorService } from './timetable-editor.service';

@Injectable()
export class TimetableAddResolverService implements Resolve<Observable<void>> {
  constructor(
    private timetableAddService: TimetableAddService,
    private timetableEditorService: TimetableEditorService
  ) {}

  resolve(route: ActivatedRouteSnapshot): Observable<void> {
    const calendarId = route.paramMap.get('calendarId');
    const tripDirection = route.paramMap.get('trip_direction') as '0' | '1';

    this.timetableAddService.setTripDirection(tripDirection);

    return forkJoin(
      this.timetableAddService.fetchCalendar(calendarId),
      this.timetableEditorService.fetchOperations(calendarId),
      this.timetableEditorService
        .fetchServiceId()
        .pipe(
          flatMap(id =>
            forkJoin(
              this.timetableEditorService.fetchStations(id, tripDirection),
              this.timetableEditorService.fetchTripClasses(id)
            )
          )
        )
    ).pipe(map(() => null));
  }
}
