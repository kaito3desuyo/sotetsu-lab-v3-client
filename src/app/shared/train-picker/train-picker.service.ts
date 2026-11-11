import { inject, Injectable } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { TodaysCalendarListState } from 'src/app/global-states/todays-calendar-list.state';
import { TRIP_BLOCK_TIMELINE_FIELDS } from 'src/app/libs/trip-block/usecase/trip-block-fields';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import { attachTripClasses } from 'src/app/shared/attach-trip-classes.util';
import { TrainPickerStore } from './train-picker.store';

@Injectable()
export class TrainPickerService {
    readonly #store = inject(TrainPickerStore);
    readonly #tripBlockService = inject(TripBlockService);
    readonly #tripClassService = inject(TripClassService);
    readonly #todaysCalendarId = inject(TodaysCalendarListState)
        .todaysCalendarId;

    /**
     * 今日のダイヤの上り・下りを取り、種別をつけて 1 本の配列にしてストアへ入れる。
     * 取れなかった（今日のダイヤが無い場合を含む）ときは fetchFailed を立てる。
     */
    fetchTripBlocks(): Observable<void> {
        this.#store.setFetchFailed(false);
        const calendarId = this.#todaysCalendarId();
        if (!calendarId) {
            this.#store.setFetchFailed(true);
            return of(undefined);
        }

        return forkJoin({
            tripClasses: this.#tripClassService.findMany({}),
            byDirection: this.#tripBlockService.findManyByCalendarId({
                calendarId,
                fields: TRIP_BLOCK_TIMELINE_FIELDS,
            }),
        }).pipe(
            tap(({ tripClasses, byDirection }) => {
                const attached = attachTripClasses(byDirection, tripClasses);
                this.#store.setTripBlocks(Object.values(attached).flat());
            }),
            map(() => undefined),
            catchError(() => {
                this.#store.setFetchFailed(true);
                return of(undefined);
            }),
        );
    }
}
