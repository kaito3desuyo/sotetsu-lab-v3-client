import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { map } from 'rxjs/operators';
import { ReadCalendarDto } from '../models/calendar/calendar-dto';

@Injectable({
    providedIn: 'root',
})
export class CalendarApiService {
    private apiUrl = environment.apiUrl + '/v1/calendars';

    constructor(private http: HttpClient) {}

    getCalendars(): Observable<{ calendars: ReadCalendarDto[] }> {
        return this.http
            .get(this.apiUrl)
            .pipe(map((data: { calendars: ReadCalendarDto[] }) => data));
    }

    getCalendarById(id: string): Observable<{ calendar: ReadCalendarDto }> {
        return this.http
            .get(this.apiUrl + '/' + id)
            .pipe(map((data: { calendar: ReadCalendarDto }) => data));
    }

    searchCalendars(query: {
        date?: string;
    }): Observable<{ calendars: ReadCalendarDto[] }> {
        return this.http
            .get(this.apiUrl + '/search', {
                params: query,
            })
            .pipe(map((data: { calendars: ReadCalendarDto[] }) => data));
    }

    searchSpecifiedDateCalendarId(query: {
        date: string;
    }): Observable<{ calendar_id: string }> {
        return this.searchCalendars({
            date: query.date,
        }).pipe(
            map((data) => {
                return {
                    calendar_id: data[0].id,
                };
            })
        );
    }
}
