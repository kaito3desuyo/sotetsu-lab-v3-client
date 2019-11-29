import { Injectable } from '@angular/core';
import { EntityState, EntityStore, StoreConfig } from '@datorama/akita';
import { ICalendar } from 'src/app/general/interfaces/calendar';

export interface CalendarsState extends EntityState<ICalendar> {}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'calendars' })
export class CalendarsStore extends EntityStore<CalendarsState> {
    constructor() {
        super();
    }
}
