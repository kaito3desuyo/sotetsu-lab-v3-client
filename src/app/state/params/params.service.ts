import { Injectable } from '@angular/core';
import { ParamsStore } from './params.store';
import { HttpClient } from '@angular/common/http';
import { tap, map } from 'rxjs/operators';
import { Observable, forkJoin } from 'rxjs';
import { CalendarApiService } from 'src/app/general/api/calendar-api.service';
import moment from 'moment';
import { CalendarModel } from 'src/app/general/models/calendar/calendar-model';

@Injectable({ providedIn: 'root' })
export class ParamsService {
    constructor(
        private paramsStore: ParamsStore,
        private calendarApi: CalendarApiService
    ) {}

    fetch(): Observable<void> {
        return forkJoin([
            this.calendarApi
                .searchCalendars({
                    date: moment()
                        .subtract(moment().hour() < 4 ? 1 : 0, 'days')
                        .format('YYYY-MM-DD')
                })
                .pipe(
                    map(data =>
                        data.calendars.map(result =>
                            CalendarModel.readCalendarDtoImpl(result)
                        )
                    )
                )
        ]).pipe(
            tap(([calendars]) => {
                this.paramsStore.update({ calendarId: calendars[0].id });
            }),
            map(() => null)
        );
    }
}
