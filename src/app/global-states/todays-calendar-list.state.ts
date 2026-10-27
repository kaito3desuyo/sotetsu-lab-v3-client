import { inject } from '@angular/core';
import {
    patchState,
    signalStore,
    type,
    withComputed,
    withMethods,
} from '@ngrx/signals';
import {
    entityConfig,
    setAllEntities,
    withEntities,
} from '@ngrx/signals/entities';
import { format } from 'date-fns';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { withAppDevtools } from '../core/store-features/with-app-devtools';
import { getRailwayDate } from 'src/app/core/utils/railway-day';
import { CalendarService } from '../libs/calendar/usecase/calendar.service';
import { CalendarDetailsDto } from '../libs/calendar/usecase/dtos/calendar-details.dto';

const calendarConfig = entityConfig({
    entity: type<CalendarDetailsDto>(),
    selectId: (calendar) => calendar.calendarId,
});

export const TodaysCalendarListState = signalStore(
    { providedIn: 'root' },
    withEntities(calendarConfig),
    withComputed(({ entities }) => ({
        todaysCalendarId: () => entities().at(0)?.calendarId,
        /**
         * 「今日有効なダイヤ集合」の calendarId 一覧（B7: 過去ダイヤ判定に使用）。
         * 現状は 1 件のみ格納されるが、将来の複数ダイヤ共存にも対応できるよう配列で公開する。
         */
        todaysCalendarIds: () =>
            entities().map((calendar) => calendar.calendarId),
    })),
    withMethods((store) => {
        const calendarService = inject(CalendarService);

        return {
            fetch(): Observable<void> {
                return calendarService
                    .findOneBySpecificDate({
                        date: format(getRailwayDate(new Date()), 'yyyy-MM-dd'),
                    })
                    .pipe(
                        tap((data: CalendarDetailsDto) => {
                            patchState(
                                store,
                                setAllEntities([data], calendarConfig),
                            );
                        }),
                        map(() => undefined),
                    );
            },
        };
    }),
    withAppDevtools('TodaysCalendarListState'),
);
