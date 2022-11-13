import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { TimetableEditFormService } from 'src/app/shared/timetable-edit-form/services/timetable-edit-form.service';
import { ETimetableEditFormMode } from 'src/app/shared/timetable-edit-form/special/enums/timetable-edit-form.enum';
import { TimetableEditFormStateStore } from 'src/app/shared/timetable-edit-form/states/timetable-edit-form.state';

@Injectable()
export class TimetableAddResolverService implements Resolve<Observable<void>> {
    constructor(
        private readonly timetableEditFormService: TimetableEditFormService,
        private readonly timetableEditFormStateStore: TimetableEditFormStateStore
    ) {}

    resolve(route: ActivatedRouteSnapshot): Observable<void> {
        const calendarId = route.paramMap.get('calendarId');
        const tripDirection = route.paramMap.get('trip_direction') as '0' | '1';

        this.timetableEditFormStateStore.setCalendarId(calendarId);
        this.timetableEditFormStateStore.setMode(ETimetableEditFormMode.ADD);
        this.timetableEditFormStateStore.setTripDirection(
            +tripDirection as ETripDirection
        );

        return forkJoin([
            this.timetableEditFormService.fetchStations(),
            this.timetableEditFormService.fetchOperations(),
            this.timetableEditFormService.fetchTripClasses(),
        ]).pipe(map(() => null));
    }
}
