import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { Observable } from 'rxjs';
import { CalendarApiService } from '../api/calendar-api.service';

@Injectable({
    providedIn: 'root'
})
export class GetCalendarsResolverService implements Resolve<any> {
    constructor(private api: CalendarApiService) {}

    resolve(): Observable<any> {
        return this.api.getCalendars();
    }
}
