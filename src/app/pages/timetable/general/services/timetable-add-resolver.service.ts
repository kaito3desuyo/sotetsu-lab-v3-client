import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';
import { TimetableAddService } from './timetable-add.service';
import { map, flatMap, tap } from 'rxjs/operators';
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

        this.timetableEditorService.setTripBlock(null);
        this.timetableEditorService.setCalendarId(calendarId);
        this.timetableEditorService.setTripDirection(
            Number(tripDirection) as 0 | 1
        );

        return forkJoin([
            this.timetableAddService.fetchCalendar(),
            this.timetableEditorService.fetchOperations(),
            this.timetableEditorService
                .fetchServiceId()
                .pipe(
                    flatMap(() =>
                        forkJoin([
                            this.timetableEditorService.fetchStations(),
                            this.timetableEditorService.fetchTripClasses()
                        ])
                    )
                )
        ]).pipe(map(() => null));
    }
}
