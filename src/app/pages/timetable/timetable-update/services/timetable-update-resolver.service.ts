import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TimetableEditFormService } from 'src/app/shared/timetable-edit-form/services/timetable-edit-form.service';
import { ETimetableEditFormMode } from 'src/app/shared/timetable-edit-form/special/enums/timetable-edit-form.enum';
import { TimetableEditFormStateStore } from 'src/app/shared/timetable-edit-form/states/timetable-edit-form.state';

@Injectable()
export class TimetableUpdateResolverService {
    constructor(
        private readonly timetableEditFormService: TimetableEditFormService,
        private readonly timetableEditFormStateStore: TimetableEditFormStateStore,
    ) {}

    resolve(route: ActivatedRouteSnapshot): Observable<void> {
        const calendarId = route.paramMap.get('calendarId');
        const tripBlockId = route.paramMap.get('tripBlockId');

        this.timetableEditFormStateStore.setCalendarId(calendarId);
        this.timetableEditFormStateStore.setTripBlockId(tripBlockId);
        this.timetableEditFormStateStore.setMode(ETimetableEditFormMode.UPDATE);

        return forkJoin([
            this.timetableEditFormService.fetchTripBlocks(),
            this.timetableEditFormService.fetchStations(),
            this.timetableEditFormService.fetchOperations(),
            this.timetableEditFormService.fetchTripClasses(),
        ]).pipe(map(() => undefined));
    }
}
