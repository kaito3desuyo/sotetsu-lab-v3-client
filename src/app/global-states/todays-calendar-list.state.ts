import { inject, Injectable } from '@angular/core';
import { createStore, select } from '@ngneat/elf';
import {
    getAllEntities,
    selectAllEntities,
    selectFirst,
    setEntities,
    withEntities,
} from '@ngneat/elf-entities';
import { format } from 'date-fns';
import { Observable } from 'rxjs';
import { getRailwayDate } from 'src/app/core/utils/railway-day';
import { map, tap } from 'rxjs/operators';
import { CalendarService } from '../libs/calendar/usecase/calendar.service';
import { CalendarDetailsDto } from '../libs/calendar/usecase/dtos/calendar-details.dto';

type State = CalendarDetailsDto;

const state = createStore(
    { name: 'TodaysCalendarList' },
    withEntities<State, 'calendarId'>({
        initialValue: [],
        idKey: 'calendarId',
    }),
);

@Injectable({ providedIn: 'root' })
export class TodaysCalendarListStateStore {
    readonly #calendarService = inject(CalendarService);

    fetch(): Observable<void> {
        return this.#calendarService
            .findOneBySpecificDate({
                date: format(getRailwayDate(new Date()), 'yyyy-MM-dd'),
            })
            .pipe(
                tap((data: CalendarDetailsDto) => {
                    state.update(setEntities([data]));
                }),
                map(() => undefined),
            );
    }
}

@Injectable({ providedIn: 'root' })
export class TodaysCalendarListStateQuery {
    readonly todaysCalendarId$ = state.pipe(
        selectFirst(),
        select((state) => state?.calendarId),
    );

    /**
     * 「今日有効なダイヤ集合」の calendarId 一覧（B7: 過去ダイヤ判定に使用）。
     * 現状は 1 件のみ格納されるが、将来の複数ダイヤ共存にも対応できるよう配列で公開する。
     */
    readonly todaysCalendarIds$ = state.pipe(
        selectAllEntities(),
        map((list) => list.map((o) => o.calendarId)),
    );

    get todaysCalendarId() {
        return state.query(getAllEntities()).at(0)?.calendarId;
    }

    get todaysCalendarIds(): string[] {
        return state.query(getAllEntities()).map((o) => o.calendarId);
    }
}
