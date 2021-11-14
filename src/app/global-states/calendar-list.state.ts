import { APP_INITIALIZER, Injectable, Provider } from '@angular/core';
import {
    EntityState,
    EntityStore,
    QueryEntity,
    StoreConfig,
} from '@datorama/akita';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { CalendarService } from '../libs/calendar/usecase/calendar.service';
import { CalendarDetailsDto } from '../libs/calendar/usecase/dtos/calendar-details.dto';

interface CalendarListState extends EntityState<CalendarDetailsDto, string> {}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'CalendarList', idKey: 'calendarId' })
export class CalendarListStateStore extends EntityStore<CalendarListState> {
    constructor(private readonly calendarService: CalendarService) {
        super();
    }

    fetch(): Observable<void> {
        const qb = RequestQueryBuilder.create()
            .setJoin([{ field: 'service' }])
            .setFilter([
                {
                    field: 'service.serviceName',
                    operator: '$eq',
                    value: '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線',
                },
            ])
            .sortBy([
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
export class CalendarListStateQuery extends QueryEntity<CalendarListState> {
    calendars$ = this.selectAll();

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
