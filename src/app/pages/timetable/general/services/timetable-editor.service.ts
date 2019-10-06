import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { IStation } from 'src/app/general/interfaces/station';
import { ServiceApiService } from 'src/app/general/api/service-api.service';
import { flatMap, map, tap } from 'rxjs/operators';
import { StationModel } from 'src/app/general/models/station/station-model';
import { IOperation } from 'src/app/general/interfaces/operation';
import { OperationApiService } from 'src/app/general/api/operation-api.service';
import { OperationModel } from 'src/app/general/models/operation/operation-model';
import { reject } from 'lodash';
import { ITripClass } from 'src/app/general/interfaces/trip-class';
import { TripApiService } from 'src/app/general/api/trip-api.service';
import { TripClassModel } from 'src/app/general/models/trip-class/trip-class-model';
import { ReadServiceDto } from 'src/app/general/models/service/service-dto';

@Injectable()
export class TimetableEditorService {
  stations$: BehaviorSubject<IStation[]> = new BehaviorSubject<IStation[]>([]);
  operations$: BehaviorSubject<IOperation[]> = new BehaviorSubject<
    IOperation[]
  >([]);
  tripClasses$: BehaviorSubject<ITripClass[]> = new BehaviorSubject<
    ITripClass[]
  >([]);

  constructor(
    private serviceApi: ServiceApiService,
    private operationApi: OperationApiService,
    private tripApi: TripApiService
  ) {}

  fetchServiceId(): Observable<string> {
    return this.serviceApi
      .searchServices({
        service_name: '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線'
      })
      .pipe(map(data => data.services[0].id));
  }

  getStations(): Observable<IStation[]> {
    return this.stations$.asObservable();
  }

  setStations(stations: IStation[]): void {
    this.stations$.next(stations);
  }

  fetchStations(serviceId: string, tripDirection: '0' | '1'): Observable<void> {
    return this.serviceApi
      .getServiceStationsById(serviceId, { trip_direction: tripDirection })
      .pipe(
        map(data =>
          data.stations.map(station => StationModel.readStationDtoImpl(station))
        ),
        tap(data => this.setStations(data)),
        map(() => null)
      );
  }

  getOperations(): Observable<IOperation[]> {
    return this.operations$.asObservable();
  }

  setOperations(operations: IOperation[]): void {
    this.operations$.next(operations);
  }

  fetchOperations(calendarId: string): Observable<void> {
    return this.operationApi.searchOperations({ calendar_id: calendarId }).pipe(
      map(data =>
        data.operations.map(operation =>
          OperationModel.readOperationDtoImpl(operation)
        )
      ),
      tap(data => {
        this.setOperations(reject(data, o => o.operationNumber === '100'));
      }),
      map(() => null)
    );
  }

  getTripClasses(): Observable<ITripClass[]> {
    return this.tripClasses$.asObservable();
  }

  setTripClasses(tripClasses: ITripClass[]): void {
    this.tripClasses$.next(tripClasses);
  }

  fetchTripClasses(serviceId: string): Observable<void> {
    return this.tripApi.getTripClasses({ service_id: serviceId }).pipe(
      map(data =>
        data.trip_classes.map(tripClass =>
          TripClassModel.readTripClassDtoImpl(tripClass)
        )
      ),
      tap(data => {
        this.setTripClasses(data);
      }),
      map(() => null)
    );
  }
}
