import { Injectable } from '@angular/core';
import {
    EntityState,
    EntityStore,
    QueryEntity,
    StoreConfig,
} from '@datorama/akita';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import dayjs from 'dayjs';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { CalendarService } from '../libs/calendar/usecase/calendar.service';
import { CalendarDetailsDto } from '../libs/calendar/usecase/dtos/calendar-details.dto';

interface TodaysCalendarListState
    extends EntityState<CalendarDetailsDto, string> {}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'TodaysCalendarList', idKey: 'calendarId' })
export class TodaysCalendarListStateStore extends EntityStore<TodaysCalendarListState> {
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

        return this.calendarService
            .findManyBySpecificDate(qb, {
                date: dayjs()
                    .subtract(dayjs().hour() < 4 ? 1 : 0, 'days')
                    .format('YYYY-MM-DD'),
            })
            .pipe(
                tap((calendars: CalendarDetailsDto[]) => {
                    this.set(calendars);
                }),
                map(() => undefined)
            );
    }
}

@Injectable({ providedIn: 'root' })
export class TodaysCalendarListStateQuery extends QueryEntity<TodaysCalendarListState> {
    todaysCalendarId$ = this.selectFirst((calendar) => calendar.calendarId);

    get todaysCalendarId() {
        const list = this.getAll();
        return list[0].calendarId;
    }

    constructor(protected store: TodaysCalendarListStateStore) {
        super(store);
    }
}
