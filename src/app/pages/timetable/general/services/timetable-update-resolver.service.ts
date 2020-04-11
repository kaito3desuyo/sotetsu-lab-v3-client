import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';
import { TimetableUpdateService } from './timetable-update.service';
import { tap, flatMap, map } from 'rxjs/operators';
import { TimetableEditorService } from './timetable-editor.service';

@Injectable()
export class TimetableUpdateResolverService
    implements Resolve<Observable<void>> {
    constructor(
        private timetableUpdateService: TimetableUpdateService,
        private timetableEditorService: TimetableEditorService
    ) {}

    resolve(route: ActivatedRouteSnapshot): Observable<void> {
        const tripBlockId = route.paramMap.get('blockId');
        this.timetableUpdateService.setBlockId(tripBlockId);

        return this.timetableEditorService.fetchTripBlock(tripBlockId).pipe(
            tap(() => {
                this.timetableEditorService.setServiceId(
                    this.timetableEditorService.getTripBlockAsStatic().trips[0]
                        .serviceId
                );
                this.timetableEditorService.setCalendarId(
                    this.timetableEditorService.getTripBlockAsStatic().trips[0]
                        .calendarId
                );
                this.timetableEditorService.setTripDirection(
                    this.timetableEditorService.getTripBlockAsStatic().trips[0]
                        .tripDirection as 0 | 1
                );
            }),
            flatMap(() =>
                forkJoin([
                    this.timetableUpdateService.fetchCalendar(),
                    this.timetableEditorService.fetchOperations(),
                    this.timetableEditorService.fetchStations(),
                    this.timetableEditorService.fetchTripClasses(),
                ]).pipe(map(() => null))
            )
        );
    }
}
