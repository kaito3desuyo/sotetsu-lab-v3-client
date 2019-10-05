import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import {
  ITimetableStation,
  ETimetableStationViewMode
} from '../interfaces/timetable-station';
import { IService } from 'src/app/general/interfaces/service';
import { ServiceApiService } from 'src/app/general/api/service-api.service';
import { map, tap } from 'rxjs/operators';
import { ServiceModel } from 'src/app/general/models/service/service-model';
import { StationModel } from 'src/app/general/models/station/station-model';
import { ITrip } from 'src/app/general/interfaces/trip';
import { PageEvent } from '@angular/material/paginator';
import { TripApiService } from 'src/app/general/api/trip-api.service';
import { TripBlockModel } from 'src/app/general/models/trip-block/trip-block-model';
import { concat } from 'lodash';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import { CalendarApiService } from 'src/app/general/api/calendar-api.service';
import { CalendarModel } from 'src/app/general/models/calendar/calendar-model';

@Injectable()
export class TimetableAllLineService {
  private calendarId: BehaviorSubject<string> = new BehaviorSubject<string>(
    null
  );

  private calendar: BehaviorSubject<ICalendar> = new BehaviorSubject<ICalendar>(
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

  private trips: BehaviorSubject<ITrip[]> = new BehaviorSubject<ITrip[]>([]);

  private pageSetting: BehaviorSubject<PageEvent> = new BehaviorSubject<
    PageEvent
  >({
    length: 0,
    pageIndex: 0,
    pageSize: 10
  });

  constructor(
    private serviceApi: ServiceApiService,
    private tripApi: TripApiService,
    private calendarApi: CalendarApiService
  ) {}

  getCalendarId(): Observable<string> {
    return this.calendarId.asObservable();
  }

  getCalendarIdAsStatic(): string {
    return this.calendarId.getValue();
  }

  setCalendarId(id: string): void {
    this.calendarId.next(id);
  }

  getCalendar(): Observable<ICalendar> {
    return this.calendar.asObservable();
  }

  setCalendar(calendar: ICalendar): void {
    this.calendar.next(calendar);
  }

  fetchCalendar(calendarId: string): Observable<void> {
    return this.calendarApi.getCalendarById(calendarId).pipe(
      map(data => CalendarModel.readCalendarDtoImpl(data.calendar)),
      tap(data => {
        this.setCalendar(data);
      }),
      map(() => null)
    );
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
              ),
              borderSetting: this.getBorderSetting(
                station.stationName,
                this.getTripDirectionAsStatic()
              )
            }))
          );
        }),
        map(() => null)
      );
  }

  getTrips(): Observable<ITrip[]> {
    return this.trips.asObservable();
  }

  getTripsByPage(): Observable<ITrip[]> {
    return combineLatest([this.getTrips(), this.getPageSetting()]).pipe(
      map(([trips, pageEvent]) => {
        const pageTrips: ITrip[] = [];
        trips.forEach((value, index) => {
          if (
            pageEvent.pageIndex * pageEvent.pageSize <= index &&
            index < (pageEvent.pageIndex + 1) * pageEvent.pageSize
          ) {
            pageTrips.push(value);
          }
        });

        return pageTrips;
      })
    );
  }

  setTrips(trips: ITrip[]): void {
    this.trips.next(trips);
  }

  fetchTrips(calendarId: string, tripDirection: '0' | '1') {
    return this.tripApi
      .searchTripsByBlocks({
        calendar_id: calendarId,
        trip_direction: tripDirection
      })
      .pipe(
        map(data =>
          data.trip_blocks.map(tripBlock =>
            TripBlockModel.readTripBlockDtoImpl(tripBlock)
          )
        ),
        tap(data => {
          let trips: ITrip[] = [];
          data.forEach(tripBlock => {
            trips = concat(trips, tripBlock.trips);
          });
          this.setTrips(trips);
          this.updatePageSetting({
            length: trips.length
          });
        })
      );
  }

  getPageSetting(): Observable<PageEvent> {
    return this.pageSetting.asObservable();
  }

  getPageSettingAsStatic(): PageEvent {
    return this.pageSetting.getValue();
  }

  setPageSetting(setting: PageEvent): void {
    this.pageSetting.next(setting);
  }

  updatePageSetting(setting: Partial<PageEvent>): void {
    const current = this.getPageSettingAsStatic();
    this.setPageSetting({
      ...current,
      ...setting
    });
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

  getBorderSetting(stationName: string, tripDirection: '0' | '1'): boolean {
    if (tripDirection === '0') {
      switch (stationName) {
        case '海老名':
        case '希望ヶ丘':
        case '横浜':
          return true;
        default:
          return false;
      }
    } else if (tripDirection === '1') {
      switch (stationName) {
        case '羽沢横浜国大':
        case '湘南台':
        case '厚木':
          return true;
        default:
          return false;
      }
    } else {
      return false;
    }
  }
}
