import { inject, Injectable } from '@angular/core';
import { CondOperator, RequestQueryBuilder } from '@nestjsx/crud-request';
import { createStore } from '@ngneat/elf';
import {
    getAllEntities,
    selectAllEntities,
    selectEntity,
    selectEntityByPredicate,
    setEntities,
    withEntities,
} from '@ngneat/elf-entities';
import dayjs from 'dayjs';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { CalendarService } from '../libs/calendar/usecase/calendar.service';
import { CalendarDetailsDto } from '../libs/calendar/usecase/dtos/calendar-details.dto';

type State = CalendarDetailsDto;

const state = createStore(
    { name: 'CalendarList' },
    withEntities<State, 'calendarId'>({
        initialValue: [],
        idKey: 'calendarId',
    }),
);

@Injectable({ providedIn: 'root' })
export class CalendarListStateStore {
    readonly #calendarService = inject(CalendarService);

    fetch(): Observable<void> {
        const qb = RequestQueryBuilder.create()
            .setJoin([{ field: 'service' }])
            .setFilter([
                {
                    field: 'service.serviceName',
                    operator: CondOperator.EQUALS,
                    value: '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線',
                },
            ])
            .sortBy([
                { field: 'startDate', order: 'ASC' },
                { field: 'monday', order: 'DESC' },
            ]);

        return this.#calendarService.findMany(qb).pipe(
            tap((data: CalendarDetailsDto[]) => {
                state.update(setEntities(data));
            }),
            map(() => undefined),
        );
    }
}

@Injectable({ providedIn: 'root' })
export class CalendarListStateQuery {
    readonly calendars$ = state.pipe(selectAllEntities());

    get calendars(): CalendarDetailsDto[] {
        return state.query(getAllEntities());
    }

    selectByCalendarId(calendarId: string): Observable<CalendarDetailsDto> {
        return state.pipe(selectEntity(calendarId));
    }

    selectByDate(date: string): Observable<CalendarDetailsDto> {
        const format = 'YYYY-MM-DD';
        const targetDate = dayjs(date, format);
        return state.pipe(
            selectEntityByPredicate(
                (e) =>
                    dayjs(e.startDate, format).isSameOrBefore(targetDate) &&
                    dayjs(e.endDate, format).isSameOrAfter(targetDate),
            ),
        );
    }
}
