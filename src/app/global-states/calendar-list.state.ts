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
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { withAppDevtools } from '../core/store-features/with-app-devtools';
import { CalendarService } from '../libs/calendar/usecase/calendar.service';
import { CalendarDetailsDto } from '../libs/calendar/usecase/dtos/calendar-details.dto';

const calendarConfig = entityConfig({
    entity: type<CalendarDetailsDto>(),
    selectId: (calendar) => calendar.calendarId,
});

export const CalendarListState = signalStore(
    { providedIn: 'root' },
    withEntities(calendarConfig),
    withComputed(({ entities }) => ({
        /** 取得した順のカレンダー */
        calendars: entities,
    })),
    withMethods((store) => {
        const calendarService = inject(CalendarService);

        return {
            fetch(): Observable<void> {
                return calendarService
                    .findMany({
                        serviceName:
                            '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線',
                    })
                    .pipe(
                        tap((data: CalendarDetailsDto[]) => {
                            patchState(
                                store,
                                setAllEntities(data, calendarConfig),
                            );
                        }),
                        map(() => undefined),
                    );
            },
        };
    }),
    withAppDevtools('CalendarListState'),
);
