import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TripApiService } from 'src/app/general/api/trip-api.service';
import { map, tap } from 'rxjs/operators';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import { CalendarApiService } from 'src/app/general/api/calendar-api.service';
import { CalendarModel } from 'src/app/general/models/calendar/calendar-model';
import { TimetableEditorService } from './timetable-editor.service';
import { NotificationService } from 'src/app/general/services/notification.service';

@Injectable()
export class TimetableUpdateService {
  blockId$: BehaviorSubject<string> = new BehaviorSubject<string>(null);
  calendar$: BehaviorSubject<ICalendar> = new BehaviorSubject<ICalendar>(null);

  constructor(
    private notificationService: NotificationService,
    private tripApi: TripApiService,
    private calendarApi: CalendarApiService,
    private timetableEditorService: TimetableEditorService
  ) {
    this.timetableEditorService.receiveSaveEvent().subscribe(formValue => {
      const data = formValue.map(value =>
        this.timetableEditorService.convertFormValueToSaveData(value)
      );

      const block = {
        trips: data
      };

      this.notificationService.open('列車を保存しています...', 'OK');

      this.tripApi
        .updateTripBlockById(this.getBlockIdAsStatic(), block)
        .subscribe(
          result => {
            this.notificationService.open('保存しました', 'OK');
          },
          error => {
            this.notificationService.open('エラーが発生しました', 'OK');
          }
        );
    });
  }

  getBlockIdAsStatic(): string {
    return this.blockId$.getValue();
  }

  setBlockId(id: string): void {
    this.blockId$.next(id);
  }

  getCalendar(): Observable<ICalendar> {
    return this.calendar$.asObservable();
  }

  setCalendar(calendar: ICalendar): void {
    this.calendar$.next(calendar);
  }

  fetchCalendar(): Observable<void> {
    return this.calendarApi
      .getCalendarById(this.timetableEditorService.getCalendarIdAsStatic())
      .pipe(
        map(data => CalendarModel.readCalendarDtoImpl(data.calendar)),
        tap(data => {
          this.setCalendar(data);
        }),
        map(() => null)
      );
  }
}
