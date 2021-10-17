import { Injectable } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    Resolve,
    RouterStateSnapshot,
} from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { flatMap, map, tap } from 'rxjs/operators';
import { TimetableCopyService } from './timetable-copy.service';
import { TimetableEditorService } from './timetable-editor.service';

@Injectable()
export class TimetableCopyResolverService implements Resolve<Observable<void>> {
    constructor(
        private timetableCopyService: TimetableCopyService,
        private timetableEditorService: TimetableEditorService
    ) {}

    resolve(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<void> {
        const calendarId = route.paramMap.get('calendarId');
        const tripBlockId = route.paramMap.get('tripBlockId');

        this.timetableEditorService.setCalendarId(calendarId);
        // this.timetableUpdateService.setBlockId(tripBlockId);

        return this.timetableEditorService.fetchTripBlock(tripBlockId).pipe(
            tap(() => {
                this.timetableEditorService.setServiceId(
                    this.timetableEditorService.getTripBlockAsStatic().trips[0]
                        .serviceId
                );
                this.timetableEditorService.setCalendarId(calendarId);
                this.timetableEditorService.setTripDirection(
                    this.timetableEditorService.getTripBlockAsStatic().trips[0]
                        .tripDirection as 0 | 1
                );
            }),
            flatMap(() =>
                forkJoin([
                    this.timetableCopyService.fetchCalendar(),
                    this.timetableEditorService.fetchOperations(),
                    this.timetableEditorService.fetchStations(),
                    this.timetableEditorService.fetchTripClasses(),
                ]).pipe(map(() => null))
            )
        );
    }
}
