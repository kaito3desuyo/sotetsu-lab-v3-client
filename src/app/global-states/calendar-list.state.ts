import { APP_INITIALIZER, Injectable, Provider } from '@angular/core';
import { EntityStore, QueryEntity, StoreConfig } from '@datorama/akita';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { CalendarService } from '../libs/calendar/usecase/calendar.service';
import { CalendarDetailsDto } from '../libs/calendar/usecase/dtos/calendar-details.dto';

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'CalendarList', idKey: 'calendarId' })
export class CalendarListStateStore extends EntityStore<CalendarDetailsDto> {
    constructor(private readonly calendarService: CalendarService) {
        super();
    }

    fetch(): Observable<void> {
        const qb = RequestQueryBuilder.create().sortBy([
            { field: 'startDate', order: 'ASC' },
            { field: 'monday', order: 'DESC' },
        ]);

        return this.calendarService.findMany(qb).pipe(
            tap((data: CalendarDetailsDto[]) => {
                this.set(data);
            }),
            map(() => null)
        );
    }
}

@Injectable({ providedIn: 'root' })
export class CalendarListStateQuery extends QueryEntity<CalendarDetailsDto> {
    constructor(protected store: CalendarListStateStore) {
        super(store);
    }
}

export const CalendarListStateStoreProvider: Provider = {
    provide: APP_INITIALIZER,
    useFactory: (calendarListStateStore: CalendarListStateStore) => () =>
        calendarListStateStore.fetch().toPromise(),
    deps: [CalendarListStateStore],
    multi: true,
};
