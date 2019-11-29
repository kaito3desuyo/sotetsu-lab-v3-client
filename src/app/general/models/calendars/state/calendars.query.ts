import { Injectable } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { CalendarsStore, CalendarsState } from './calendars.store';

@Injectable({ providedIn: 'root' })
export class CalendarsQuery extends QueryEntity<CalendarsState> {
    constructor(protected store: CalendarsStore) {
        super(store);
    }
}
