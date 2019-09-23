import { Injectable } from '@angular/core';
import { IOperation } from 'src/app/general/interfaces/operation';
import { BehaviorSubject, Observable, pipe, of } from 'rxjs';
import { OperationApiService } from 'src/app/general/api/operation-api.service';
import { map, tap, flatMap } from 'rxjs/operators';
import { OperationModel } from 'src/app/general/models/operation/operation-model';
import { IStation } from 'src/app/general/interfaces/station';
import { StationApiService } from 'src/app/general/api/station-api.service';
import { StationModel } from 'src/app/general/models/station/station-model';
import { ITripClass } from 'src/app/general/interfaces/trip-class';
import { TripApiService } from 'src/app/general/api/trip-api.service';
import { TripClassModel } from 'src/app/general/models/trip-class/trip-class-model';
import { ServiceApiService } from 'src/app/general/api/service-api.service';
import { ReadServiceDto } from 'src/app/general/models/service/service-dto';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import { CalendarApiService } from 'src/app/general/api/calendar-api.service';
import { CalendarModel } from 'src/app/general/models/calendar/calendar-model';

@Injectable()
export class OperationTableService {
  private calendar$: BehaviorSubject<ICalendar> = new BehaviorSubject<
    ICalendar
  >(null);

  private operationTrips$: BehaviorSubject<IOperation[]> = new BehaviorSubject<
    IOperation[]
  >([]);

  private stations$: BehaviorSubject<IStation[]> = new BehaviorSubject<
    IStation[]
  >([]);

  private tripClasses$: BehaviorSubject<ITripClass[]> = new BehaviorSubject<
    ITripClass[]
  >([]);

  constructor(
    private calendarApi: CalendarApiService,
    private serviceApi: ServiceApiService,
    private operationApi: OperationApiService,
    private stationApi: StationApiService,
    private tripApi: TripApiService
  ) {}

  getCalendar(): Observable<ICalendar> {
    return this.calendar$.asObservable();
  }

  setCalendar(calendar: ICalendar): void {
    this.calendar$.next(calendar);
  }

  fetchCalendar(id: string): Observable<void> {
    return this.calendarApi.getCalendarById(id).pipe(
      map(data => CalendarModel.readCalendarDtoImpl(data.calendar)),
      tap(data => {
        this.setCalendar(data);
      }),
      map(() => null)
    );
  }

  getOperationTrips(): Observable<IOperation[]> {
    return this.operationTrips$.asObservable();
  }

  setOperationTrips(array: IOperation[]): void {
    this.operationTrips$.next(array);
  }

  fetchOperationTrips(calendarId: string): Observable<void> {
    return this.operationApi
      .getOperationsTrips({
        calendar_id: calendarId
      })
      .pipe(
        map(data => {
          return data.operations.map(result =>
            OperationModel.readOperationDtoImpl(result)
          );
        }),
        tap(data => {
          this.setOperationTrips(data);
        }),
        map(() => null)
      );
  }

  getStations(): Observable<IStation[]> {
    return this.stations$.asObservable();
  }

  setStations(array: IStation[]): void {
    this.stations$.next(array);
  }

  fetchStations(): Observable<void> {
    return this.stationApi.getStations().pipe(
      pipe(
        map(data =>
          data.stations.map(result => StationModel.readStationDtoImpl(result))
        ),
        tap(data => {
          this.setStations(data);
        }),
        map(() => null)
      )
    );
  }

  getTripClasses(): Observable<ITripClass[]> {
    return this.tripClasses$.asObservable();
  }

  setTripClasses(array: ITripClass[]): void {
    this.tripClasses$.next(array);
  }

  fetchTripClasses(): Observable<void> {
    return this.serviceApi
      .searchServices({
        service_name: '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線'
      })
      .pipe(
        flatMap((data: { services: ReadServiceDto[] }) =>
          this.tripApi.getTripClasses({
            service_id: data.services[0].id
          })
        ),
        map(data =>
          data.trip_classes.map(result =>
            TripClassModel.readTripClassDtoImpl(result)
          )
        ),
        tap(data => {
          this.setTripClasses(data);
        }),
        map(() => null)
      );
  }
}
