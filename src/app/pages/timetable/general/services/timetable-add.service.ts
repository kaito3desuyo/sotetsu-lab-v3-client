import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import { CalendarApiService } from 'src/app/general/api/calendar-api.service';
import { map, tap } from 'rxjs/operators';
import { CalendarModel } from 'src/app/general/models/calendar/calendar-model';
import { TimetableEditorService } from './timetable-editor.service';
import {
  CreateTripBlockDto,
  ReadTripBlockDto
} from 'src/app/general/models/trip-block/trip-block-dto';
import { TripApiService } from 'src/app/general/api/trip-api.service';
import { NotificationService } from 'src/app/general/services/notification.service';
import { UpdateTripOperationListDto } from 'src/app/general/models/trip-operation-list/trip-operation-list-dto';
import { TripOperationListApiService } from 'src/app/general/api/trip-operation-list-api.service';

@Injectable()
export class TimetableAddService {
  private _subscription: Subscription = new Subscription();
  get subscription() {
    return this._subscription;
  }
  set subscription(sub: Subscription) {
    this._subscription.add(sub);
  }

  isSaveTripsIndividually$: BehaviorSubject<boolean> = new BehaviorSubject<
    boolean
  >(false);
  serviceId$: BehaviorSubject<string> = new BehaviorSubject<string>(null);
  calendar$: BehaviorSubject<ICalendar> = new BehaviorSubject<ICalendar>(null);
  tripDirection$: BehaviorSubject<'0' | '1'> = new BehaviorSubject<'0' | '1'>(
    null
  );

  constructor(
    private notificationService: NotificationService,
    private calendarApi: CalendarApiService,
    private tripApi: TripApiService,
    private tripOperationListApi: TripOperationListApiService,
    private timetableEditorService: TimetableEditorService
  ) {}

  receiveSaveEvent(): Subscription {
    return (this.subscription = this.timetableEditorService
      .receiveSaveEvent()
      .subscribe(formValue => {
        const data = formValue.map(value =>
          this.timetableEditorService.convertFormValueToSaveData(value)
        );
        const isSaveTripsIndividually = this.getIsSaveTripsIndividuallyAsStatic();

        let blocks = [];
        if (isSaveTripsIndividually) {
          blocks = data.map(trip => ({ trips: [trip] }));
        } else {
          blocks = [
            {
              trips: data
            }
          ];
        }

        this.notificationService.open('列車を保存しています...', 'OK');

        this.addTripBlocks(blocks).subscribe(
          result => {
            this.timetableEditorService.emitClearEvent();
            this.notificationService.open('保存しました', 'OK');
          },
          error => {
            this.notificationService.open('エラーが発生しました', 'OK');
          }
        );
      }));
  }

  getIsSaveTripsIndividuallyAsStatic(): boolean {
    return this.isSaveTripsIndividually$.getValue();
  }

  setIsSaveTripsIndividually(bool: boolean): void {
    this.isSaveTripsIndividually$.next(bool);
  }

  getServiceIdAsStatic(): string {
    return this.serviceId$.getValue();
  }

  setServiceId(id: string): void {
    this.serviceId$.next(id);
  }

  getCalendar(): Observable<ICalendar> {
    return this.calendar$.asObservable();
  }

  getCalendarAsStatic(): ICalendar {
    return this.calendar$.getValue();
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

  getTripDirection(): Observable<'0' | '1'> {
    return this.tripDirection$.asObservable();
  }

  getTripDirectionAsStatic(): '0' | '1' {
    return this.tripDirection$.getValue();
  }

  setTripDirection(direction: '0' | '1'): void {
    this.tripDirection$.next(direction);
  }

  addTripBlocks(
    body: CreateTripBlockDto[]
  ): Observable<{ trip_blocks: ReadTripBlockDto[] }> {
    return this.tripApi.addTripBlocks(body);
  }

  patchTripOperationLists(
    id: string,
    body: Partial<UpdateTripOperationListDto>
  ): Observable<any> {
    return this.tripOperationListApi.patchTripOperationListById(id, body);
  }
}
