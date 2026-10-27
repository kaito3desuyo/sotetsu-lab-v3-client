import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { setAllEntities } from '@ngrx/signals/entities';
import { unprotected } from '@ngrx/signals/testing';
import { CalendarDetailsDto } from '../../libs/calendar/usecase/dtos/calendar-details.dto';
import { TodaysCalendarListState } from '../todays-calendar-list.state';

/** spec 用: 本物の TodaysCalendarListState に「今日のダイヤ」を入れる（空なら今日のダイヤ無し） */
export function setTodaysCalendars(calendarIds: string[]): void {
    patchState(
        unprotected(TestBed.inject(TodaysCalendarListState)),
        setAllEntities(
            calendarIds.map(
                (calendarId) => ({ calendarId }) as CalendarDetailsDto,
            ),
            { selectId: (calendar: CalendarDetailsDto) => calendar.calendarId },
        ),
    );
}
