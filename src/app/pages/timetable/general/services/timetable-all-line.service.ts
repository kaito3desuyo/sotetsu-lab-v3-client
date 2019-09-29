import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  ITimetableStation,
  ETimetableStationViewMode
} from '../interfaces/timetable-station';
import { IService } from 'src/app/general/interfaces/service';
import { ServiceApiService } from 'src/app/general/api/service-api.service';
import { map, tap } from 'rxjs/operators';
import { ServiceModel } from 'src/app/general/models/service/service-model';
import { StationModel } from 'src/app/general/models/station/station-model';

@Injectable()
export class TimetableAllLineService {
  private calendarId: BehaviorSubject<string> = new BehaviorSubject<string>(
    null
  );

  private tripDirection: BehaviorSubject<'0' | '1'> = new BehaviorSubject<
    '0' | '1'
  >(null);

  private service: BehaviorSubject<IService> = new BehaviorSubject<IService>(
    null
  );

  private stations: BehaviorSubject<ITimetableStation[]> = new BehaviorSubject<
    ITimetableStation[]
  >([]);

  constructor(private serviceApi: ServiceApiService) {}

  getCalendarId(): Observable<string> {
    return this.calendarId.asObservable();
  }

  setCalendarId(id: string): void {
    this.calendarId.next(id);
  }

  getTripDirection(): Observable<'0' | '1'> {
    return this.tripDirection.asObservable();
  }

  getTripDirectionAsStatic(): '0' | '1' {
    return this.tripDirection.getValue();
  }

  setTripDirection(direction: '0' | '1'): void {
    this.tripDirection.next(direction);
  }

  getService(): Observable<IService> {
    return this.service.asObservable();
  }

  getServiceAsStatic(): IService {
    return this.service.getValue();
  }

  setService(data: IService): void {
    this.service.next(data);
  }

  fetchService(): Observable<void> {
    return this.serviceApi
      .searchServices({
        service_name: '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線'
      })
      .pipe(
        map(data => {
          return ServiceModel.readServiceDtoImpl(data.services[0]);
        }),
        tap(data => {
          this.setService(data);
        }),
        map(() => null)
      );
  }

  getStations(): Observable<ITimetableStation[]> {
    return this.stations.asObservable();
  }

  setStations(array: ITimetableStation[]): void {
    this.stations.next(array);
  }

  fetchStations(serviceId: string, tripDirection: '0' | '1'): Observable<void> {
    return this.serviceApi
      .getServiceStationsById(serviceId, {
        trip_direction: tripDirection
      })
      .pipe(
        map(data => {
          return data.stations.map(result =>
            StationModel.readStationDtoImpl(result)
          );
        }),
        tap(data => {
          this.setStations(
            data.map(station => ({
              ...station,
              viewMode: this.getViewMode(
                station.stationName,
                this.getTripDirectionAsStatic()
              )
            }))
          );
        }),
        map(() => null)
      );
  }

  getViewMode(
    stationName: string,
    tripDirection: '0' | '1'
  ): ETimetableStationViewMode {
    if (tripDirection === '0') {
      switch (stationName) {
        case '大和':
        case 'いずみ野':
        case '二俣川':
        case '新宿':
        case '大宮':
          return ETimetableStationViewMode.DEPARTURE_AND_ARRIVAL;
        case '横浜':
        case '川越':
          return ETimetableStationViewMode.ONLY_INBOUND_ARRIVAL;
        default:
          return ETimetableStationViewMode.ONLY_DEPARTURE;
      }
    } else if (tripDirection === '1') {
      switch (stationName) {
        case '大宮':
        case '新宿':
        case '二俣川':
        case '大和':
        case 'いずみ野':
          return ETimetableStationViewMode.DEPARTURE_AND_ARRIVAL;
        case '海老名':
        case '湘南台':
        case '厚木':
          return ETimetableStationViewMode.ONLY_OUTBOUND_ARRIVAL;
        default:
          return ETimetableStationViewMode.ONLY_DEPARTURE;
      }
    } else {
      return null;
    }
  }
}
