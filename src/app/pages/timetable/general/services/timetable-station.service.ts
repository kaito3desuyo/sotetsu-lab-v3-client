import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import { CalendarApiService } from 'src/app/general/api/calendar-api.service';
import { map, tap } from 'rxjs/operators';
import { CalendarModel } from 'src/app/general/models/calendar/calendar-model';
import { IStation } from 'src/app/general/interfaces/station';
import { StationApiService } from 'src/app/general/api/station-api.service';
import { StationModel } from 'src/app/general/models/station/station-model';
import { ITime } from 'src/app/general/interfaces/time';
import { TimeApiService } from 'src/app/general/api/time-api.service';
import { TimeModel } from 'src/app/general/models/time/time-model';
import { IOperationSighting } from 'src/app/general/interfaces/operation-sighting';
import { OperationApiService } from 'src/app/general/api/operation-api.service';
import { OperationSightingModel } from 'src/app/general/models/operation-sighting/operation-sighting-model';

@Injectable()
export class TimetableStationService {
  private _calendarId$: BehaviorSubject<string> = new BehaviorSubject<string>(
    null
  );
  private _calendar$: BehaviorSubject<ICalendar> = new BehaviorSubject<
    ICalendar
  >(null);

  private _stationId$: BehaviorSubject<string> = new BehaviorSubject<string>(
    null
  );
  private _station$: BehaviorSubject<IStation> = new BehaviorSubject<IStation>(
    null
  );

  private _tripDirection$: BehaviorSubject<'0' | '1'> = new BehaviorSubject<
    '0' | '1'
  >(null);

  private _times$: BehaviorSubject<ITime[]> = new BehaviorSubject<ITime[]>([]);

  private _operationSightings$: BehaviorSubject<
    IOperationSighting[]
  > = new BehaviorSubject<IOperationSighting[]>([]);

  constructor(
    private calendarApi: CalendarApiService,
    private stationApi: StationApiService,
    private timeApi: TimeApiService,
    private operationApi: OperationApiService
  ) {}

  getCalendarId(): Observable<string> {
    return this._calendarId$.asObservable();
  }

  getCalendarIdAsStatic(): string {
    return this._calendarId$.getValue();
  }

  setCalendarId(id: string): void {
    this._calendarId$.next(id);
  }

  getCalendar(): Observable<ICalendar> {
    return this._calendar$.asObservable();
  }

  setCalendar(calendar: ICalendar): void {
    this._calendar$.next(calendar);
  }

  fetchCalendar(): Observable<void> {
    return this.calendarApi.getCalendarById(this.getCalendarIdAsStatic()).pipe(
      map(data => CalendarModel.readCalendarDtoImpl(data.calendar)),
      tap(data => {
        this.setCalendar(data);
      }),
      map(() => null)
    );
  }

  getStationId(): Observable<string> {
    return this._stationId$.asObservable();
  }

  getStationIdAsStatic(): string {
    return this._stationId$.getValue();
  }

  setStationId(id: string): void {
    this._stationId$.next(id);
  }

  getStation(): Observable<IStation> {
    return this._station$.asObservable();
  }

  setStation(station: IStation): void {
    this._station$.next(station);
  }

  fetchStation(): Observable<void> {
    return this.stationApi.getStationById(this.getStationIdAsStatic()).pipe(
      map(data => StationModel.readStationDtoImpl(data.station)),
      tap(data => {
        this.setStation(data);
      }),
      map(() => null)
    );
  }

  getTripDirection(): Observable<'0' | '1'> {
    return this._tripDirection$.asObservable();
  }

  getTripDirectionAsStatic(): '0' | '1' {
    return this._tripDirection$.getValue();
  }

  setTripDirection(direction: '0' | '1'): void {
    this._tripDirection$.next(direction);
  }

  getTimes(): Observable<ITime[]> {
    return this._times$.asObservable();
  }

  setTimes(times: ITime[]): void {
    this._times$.next(times);
  }

  fetchTimes(): Observable<void> {
    return this.timeApi
      .searchTimes({
        station_id: this.getStationIdAsStatic(),
        calendar_id: this.getCalendarIdAsStatic(),
        trip_direction: this.getTripDirectionAsStatic()
      })
      .pipe(
        map(data => data.times.map(o => TimeModel.readTimeDtoImpl(o))),
        tap(data => {
          this.setTimes(data);
        }),
        map(() => null)
      );
  }

  getOperationSightings(): Observable<IOperationSighting[]> {
    return this._operationSightings$.asObservable();
  }

  setOperationSightings(sightings: IOperationSighting[]): void {
    this._operationSightings$.next(sightings);
  }

  fetchOperationSightings(): Observable<void> {
    return this.operationApi
      .getOperationSightingsLatest({
        calendar_id: this.getCalendarIdAsStatic()
      })
      .pipe(
        map(data =>
          data.group_by_operations.map(o =>
            OperationSightingModel.readOperationSightingDtoImpl(o)
          )
        ),
        tap(data => {
          console.log(data);
          this.setOperationSightings(data);
        }),
        map(() => null)
      );
  }
}
