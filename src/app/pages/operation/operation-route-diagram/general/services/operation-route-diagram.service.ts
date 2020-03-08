import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { ITripOperationList } from 'src/app/general/interfaces/trip-operation-list';
import { TripOperationListApiService } from 'src/app/general/api/trip-operation-list-api.service';
import { map, tap, flatMap } from 'rxjs/operators';
import { ReadTripOperationListDto } from 'src/app/general/models/trip-operation-list/trip-operation-list-dto';
import { TripOperationListModel } from 'src/app/general/models/trip-operation-list/trip-operation-list-model';
import { IStation } from 'src/app/general/interfaces/station';
import { StationApiService } from 'src/app/general/api/station-api.service';
import { ReadStationDto } from 'src/app/general/models/station/station-dto';
import { StationModel } from 'src/app/general/models/station/station-model';
import { map as lodashMap, find } from 'lodash-es';
import { OperationApiService } from 'src/app/general/api/operation-api.service';
import { CalendarApiService } from 'src/app/general/api/calendar-api.service';
import { OperationModel } from 'src/app/general/models/operation/operation-model';
import { CalendarModel } from 'src/app/general/models/calendar/calendar-model';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import { IOperation } from 'src/app/general/interfaces/operation';

@Injectable()
export class OperationRouteDiagramService {
    private _calendars$: BehaviorSubject<ICalendar[]> = new BehaviorSubject<
        ICalendar[]
    >([]);
    calendars$ = this._calendars$.asObservable();

    private _operations$: BehaviorSubject<IOperation[]> = new BehaviorSubject<
        IOperation[]
    >([]);
    operations$ = this._operations$.asObservable();

    private _calendar$: BehaviorSubject<ICalendar> = new BehaviorSubject<
        ICalendar
    >(null);
    calendar$ = this._calendar$.asObservable();

    private _operation$: BehaviorSubject<IOperation> = new BehaviorSubject<
        IOperation
    >(null);
    operation$ = this._operation$.asObservable();

    private _tripOperationLists$: BehaviorSubject<
        ITripOperationList[]
    > = new BehaviorSubject<ITripOperationList[]>([]);
    tripOperationLists$ = this._tripOperationLists$.asObservable();

    private _stations$: BehaviorSubject<IStation[]> = new BehaviorSubject<
        IStation[]
    >([]);
    stations$ = this._stations$.asObservable();

    constructor(
        private tripOperationListApi: TripOperationListApiService,
        private stationApi: StationApiService,
        private operationApi: OperationApiService,
        private calendarApi: CalendarApiService
    ) {}

    fetchCalendars(): Observable<void> {
        return this.calendarApi.getCalendars().pipe(
            map(data =>
                data.calendars.map(o => CalendarModel.readCalendarDtoImpl(o))
            ),
            tap(calendars => this._calendars$.next(calendars)),
            map(() => null)
        );
    }

    fetchOperations(calendarId: string): Observable<void> {
        return this.operationApi
            .searchOperations({
                calendar_id: calendarId
            })
            .pipe(
                map(data =>
                    data.operations
                        .filter(o => o.operation_number !== '100')
                        .sort(
                            (a, b) =>
                                Number(a.operation_number) -
                                Number(b.operation_number)
                        )
                        .map(o => OperationModel.readOperationDtoImpl(o))
                ),
                tap(operations => this._operations$.next(operations)),
                map(() => null)
            );
    }

    fetchOperationAndCalender(operationId: string): Observable<void> {
        return this.operationApi.getOperationById(operationId).pipe(
            map(data => OperationModel.readOperationDtoImpl(data.operation)),
            tap(operation => {
                this._operation$.next(operation);
            }),
            flatMap(operation => {
                return this.calendarApi.getCalendarById(operation.calendarId);
            }),
            map(data => CalendarModel.readCalendarDtoImpl(data.calendar)),
            tap(calendar => {
                this._calendar$.next(calendar);
            }),
            map(() => null)
        );
    }

    fetchTripOperationLists(operationId: string): Observable<void> {
        return this.tripOperationListApi
            .searchTripOperationLists({ operation_id: operationId })
            .pipe(
                map(
                    (data: {
                        trip_operation_lists: ReadTripOperationListDto[];
                    }) =>
                        data.trip_operation_lists.map(result =>
                            TripOperationListModel.readTripOperationListDtoImpl(
                                result
                            )
                        )
                ),
                tap((data: ITripOperationList[]) => {
                    this._tripOperationLists$.next(data);
                }),
                map(() => null)
            );
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
            '赤羽',
            '武蔵浦和',
            '大宮',
            '指扇',
            '川越'
        ];

        return this.stationApi.getStations().pipe(
            map((data: { stations: ReadStationDto[] }) =>
                data.stations.map(result =>
                    StationModel.readStationDtoImpl(result)
                )
            ),
            tap((data: IStation[]) => {
                const stations = lodashMap(targetStation, stationName =>
                    find(data, obj => obj.stationName === stationName)
                );
                this._stations$.next(stations);
            }),
            map(() => null)
        );
    }
}
