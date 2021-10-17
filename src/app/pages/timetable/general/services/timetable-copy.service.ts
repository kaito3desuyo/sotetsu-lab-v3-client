import { Injectable } from '@angular/core';
import { omit } from 'lodash';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { CalendarApiService } from 'src/app/general/api/calendar-api.service';
import { TripApiService } from 'src/app/general/api/trip-api.service';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import { CalendarModel } from 'src/app/general/models/calendar/calendar-model';
import { NotificationService } from 'src/app/general/services/notification.service';
import { TimetableEditorService } from './timetable-editor.service';

@Injectable()
export class TimetableCopyService {
    private _subscription: Subscription = new Subscription();
    get subscription() {
        return this._subscription;
    }
    set subscription(sub: Subscription) {
        this._subscription.add(sub);
    }

    calendar$: BehaviorSubject<ICalendar> = new BehaviorSubject<ICalendar>(
        null
    );

    constructor(
        private notificationService: NotificationService,
        private tripApi: TripApiService,
        private calendarApi: CalendarApiService,
        private timetableEditorService: TimetableEditorService
    ) {}

    receiveSaveEvent(): Subscription {
        return (this.subscription = this.timetableEditorService
            .receiveSaveEvent()
            .subscribe((formValue) => {
                const data = formValue.map((value) =>
                    this.timetableEditorService.convertFormValueToSaveData({
                        ...omit(value, ['id']),
                        times: value.times.map((o) => omit(o, ['id'])),
                    })
                );

                const blocks = [
                    {
                        trips: data,
                    },
                ];

                this.notificationService.open('列車を保存しています...', 'OK');

                this.tripApi.addTripBlocks(blocks).subscribe(
                    (result) => {
                        this.timetableEditorService.emitClearEvent();
                        this.notificationService.open('保存しました', 'OK');
                    },
                    (error) => {
                        this.notificationService.open(
                            'エラーが発生しました',
                            'OK'
                        );
                    }
                );
            }));
    }

    getCalendar(): Observable<ICalendar> {
        return this.calendar$.asObservable();
    }

    setCalendar(calendar: ICalendar): void {
        this.calendar$.next(calendar);
    }

    fetchCalendar(): Observable<void> {
        return this.calendarApi
            .getCalendarById(
                this.timetableEditorService.getCalendarIdAsStatic()
            )
            .pipe(
                map((data) => CalendarModel.readCalendarDtoImpl(data.calendar)),
                tap((data) => {
                    this.setCalendar(data);
                }),
                map(() => null)
            );
    }
}
