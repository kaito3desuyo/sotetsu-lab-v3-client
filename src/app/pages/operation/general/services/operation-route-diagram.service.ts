import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ITripOperationList } from 'src/app/general/interfaces/trip-operation-list';
import { TripOperationListApiService } from 'src/app/general/api/trip-operation-list-api.service';
import { map, tap, flatMap } from 'rxjs/operators';
import { ReadTripOperationListDto } from 'src/app/general/models/trip-operation-list/trip-operation-list-dto';
import { TripOperationListModel } from 'src/app/general/models/trip-operation-list/trip-operation-list-model';
import { IStation } from 'src/app/general/interfaces/station';
import { StationApiService } from 'src/app/general/api/station-api.service';
import { ReadStationDto } from 'src/app/general/models/station/station-dto';
import { StationModel } from 'src/app/general/models/station/station-model';
import { map as lodashMap, find } from 'lodash';
import { OperationApiService } from 'src/app/general/api/operation-api.service';
import { CalendarApiService } from 'src/app/general/api/calendar-api.service';
import { OperationModel } from 'src/app/general/models/operation/operation-model';
import { CalendarModel } from 'src/app/general/models/calendar/calendar-model';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import { IOperation } from 'src/app/general/interfaces/operation';

@Injectable()
export class OperationRouteDiagramService {
  private calendar: BehaviorSubject<ICalendar> = new BehaviorSubject<ICalendar>(
    null
  );

  private operation: BehaviorSubject<IOperation> = new BehaviorSubject<
    IOperation
  >(null);

  private tripOperationLists: BehaviorSubject<
    ITripOperationList[]
  > = new BehaviorSubject<ITripOperationList[]>([]);

  private stations: BehaviorSubject<IStation[]> = new BehaviorSubject<
    IStation[]
  >([]);

  constructor(
    private tripOperationListApi: TripOperationListApiService,
    private stationApi: StationApiService,
    private operationApi: OperationApiService,
    private calendarApi: CalendarApiService
  ) {}

  getCalendar(): Observable<ICalendar> {
    return this.calendar.asObservable();
  }

  setCalendar(data: ICalendar): void {
    this.calendar.next(data);
  }

  getOperation(): Observable<IOperation> {
    return this.operation.asObservable();
  }

  setOperation(data: IOperation): void {
    this.operation.next(data);
  }

  fetchOperationAndCalender(operationId: string): Observable<void> {
    return this.operationApi.getOperationById(operationId).pipe(
      map(data => OperationModel.readOperationDtoImpl(data.operation)),
      tap(operation => {
        this.setOperation(operation);
      }),
      flatMap(operation => {
        return this.calendarApi.getCalendarById(operation.calendarId);
      }),
      map(data => CalendarModel.readCalendarDtoImpl(data.calendar)),
      tap(calendar => {
        this.setCalendar(calendar);
      }),
      map(() => null)
    );
  }

  getTripOperationLists(): Observable<ITripOperationList[]> {
    return this.tripOperationLists.asObservable();
  }

  setTripOperationLists(array: ITripOperationList[]): void {
    this.tripOperationLists.next(array);
  }

  fetchTripOperationLists(operationId: string): Observable<void> {
    return this.tripOperationListApi
      .searchTripOperationLists({ operation_id: operationId })
      .pipe(
        map((data: { trip_operation_lists: ReadTripOperationListDto[] }) =>
          data.trip_operation_lists.map(result =>
            TripOperationListModel.readTripOperationListDtoImpl(result)
          )
        ),
        tap((data: ITripOperationList[]) => {
          this.setTripOperationLists(data);
        }),
        map(() => null)
      );
  }

  getStations(): Observable<IStation[]> {
    return this.stations.asObservable();
  }

  setStations(array: IStation[]): void {
    this.stations.next(array);
  }

  fetchStations(): Observable<void> {
    const targetStation = [
      '厚木',
      '海老名',
      'かしわ台',
      '相模大塚',
      '大和',
      '瀬谷',
      '湘南台',
      'いずみ野',
      '二俣川',
      '西谷',
      '星川',
      '西横浜',
      '横浜',
      '羽沢横浜国大',
      '大崎',
      '新宿',
      '池袋',
      '板橋',
      '大宮',
      '川越'
    ];

    return this.stationApi.getStations().pipe(
      map((data: { stations: ReadStationDto[] }) =>
        data.stations.map(result => StationModel.readStationDtoImpl(result))
      ),
      tap((data: IStation[]) => {
        const stations = lodashMap(targetStation, stationName =>
          find(data, obj => obj.stationName === stationName)
        );
        this.setStations(stations);
      }),
      map(() => null)
    );
  }
}
