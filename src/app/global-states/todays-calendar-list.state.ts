import { inject } from '@angular/core';
import {
    patchState,
    signalStore,
    type,
    withComputed,
    withMethods,
    withState,
} from '@ngrx/signals';
import {
    entityConfig,
    setAllEntities,
    withEntities,
} from '@ngrx/signals/entities';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { withAppDevtools } from '../core/store-features/with-app-devtools';
import { railwayDateKey } from 'src/app/core/utils/railway-day';
import { CalendarService } from '../libs/calendar/usecase/calendar.service';
import { CalendarDetailsDto } from '../libs/calendar/usecase/dtos/calendar-details.dto';

const calendarConfig = entityConfig({
    entity: type<CalendarDetailsDto>(),
    selectId: (calendar) => calendar.calendarId,
});

export const TodaysCalendarListState = signalStore(
    { providedIn: 'root' },
    withEntities(calendarConfig),
    /** 取ったときの営業日（yyyy-MM-dd）。4 時をまたいで古くなったかの判定に使う */
    withState({ fetchedDate: null as string | null }),
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
            /** 取ってある一覧が now の営業日のものか。まだ取っていなければ古いとは言わない */
            isForToday(now: Date = new Date()): boolean {
                const fetchedDate = store.fetchedDate();
                return (
                    fetchedDate === null || fetchedDate === railwayDateKey(now)
                );
            },
            /** now の営業日の一覧を取り終えたと記録する（取り直しが全部成功したあとに呼ぶ） */
            markFetched(now: Date = new Date()): void {
                patchState(store, {
                    fetchedDate: railwayDateKey(now),
                });
            },
            /**
             * recordDate: false のときは営業日を記録しない（operation・formation も取る取り直しで、
             * 全部成功してから markFetched するため）
             */
            fetch(options: { recordDate?: boolean } = {}): Observable<void> {
                const date = railwayDateKey();
                return calendarService.findOneBySpecificDate({ date }).pipe(
                    tap((data: CalendarDetailsDto) => {
                        patchState(
                            store,
                            setAllEntities([data], calendarConfig),
                            options.recordDate === false
                                ? {}
                                : { fetchedDate: date },
                        );
                    }),
                    map(() => undefined),
                );
            },
        };
    }),
    withAppDevtools('TodaysCalendarListState'),
);
