import { Injectable } from '@angular/core';
import { CondOperator, RequestQueryBuilder } from '@nestjsx/crud-request';
import { sortBy } from 'lodash-es';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { CalendarApiService } from 'src/app/general/api/calendar-api.service';
import { OperationApiService } from 'src/app/general/api/operation-api.service';
import { StationApiService } from 'src/app/general/api/station-api.service';
import { TripOperationListApiService } from 'src/app/general/api/trip-operation-list-api.service';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import { IOperation } from 'src/app/general/interfaces/operation';
import { CalendarModel } from 'src/app/general/models/calendar/calendar-model';
import { OperationModel } from 'src/app/general/models/operation/operation-model';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { StationService } from 'src/app/libs/station/usecase/station.service';
import {
    OperationRouteDiagramStateQuery,
    OperationRouteDiagramStateStore,
} from '../../states/operation-route-diagram.state';

@Injectable()
export class OperationRouteDiagramService {
    private _calendarId$: BehaviorSubject<string> = new BehaviorSubject<string>(
        null
    );
    set calendarId(id: string) {
        this._calendarId$.next(id);
    }

    private _operationId$: BehaviorSubject<string> =
        new BehaviorSubject<string>(null);
    set operationId(id: string) {
        this._operationId$.next(id);
    }

    private _calendars$: BehaviorSubject<ICalendar[]> = new BehaviorSubject<
        ICalendar[]
    >([]);
    calendars$ = this._calendars$.asObservable();

    private _operations$: BehaviorSubject<IOperation[]> = new BehaviorSubject<
        IOperation[]
    >([]);
    operations$ = this._operations$.asObservable();

    constructor(
        private tripOperationListApi: TripOperationListApiService,
        private stationApi: StationApiService,
        private operationApi: OperationApiService,
        private calendarApi: CalendarApiService,
        private readonly operationService: OperationService,
        private readonly stationService: StationService,
        private readonly operationRouteDiagramStateStore: OperationRouteDiagramStateStore,
        private readonly operationRouteDiagramStateQuery: OperationRouteDiagramStateQuery
    ) {}

    fetchCalendars(): Observable<void> {
        return this.calendarApi.getCalendars().pipe(
            map((data) =>
                data.calendars.map((o) => CalendarModel.readCalendarDtoImpl(o))
            ),
            tap((calendars) => this._calendars$.next(calendars)),
            map(() => null)
        );
    }

    fetchOperations(): Observable<void> {
        const id = this._calendarId$.getValue();
        if (!id) {
            return of(null).pipe(tap(() => this._operations$.next(null)));
        }
        return this.operationApi
            .searchOperations({
                calendar_id: id,
            })
            .pipe(
                map((data) =>
                    data.operations
                        .filter((o) => o.operation_number !== '100')
                        .sort(
                            (a, b) =>
                                Number(a.operation_number) -
                                Number(b.operation_number)
                        )
                        .map((o) => OperationModel.readOperationDtoImpl(o))
                ),
                tap((operations) => this._operations$.next(operations)),
                map(() => null)
            );
    }

    // v2

    fetchOperationTrips(): Observable<void> {
        const operationId = this.operationRouteDiagramStateQuery.operationId;
        const qb = new RequestQueryBuilder().setJoin([{ field: 'calendar' }]);

        return this.operationService.findOneWithTrips(operationId, qb).pipe(
            tap((operationTrips) => {
                this.operationRouteDiagramStateStore.setOperationTrips(
                    operationTrips
                );
            }),
            map(() => undefined)
        );
    }

    fetchStationsV2(): Observable<void> {
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
            '川越',
        ];

        const qb = new RequestQueryBuilder().setFilter([
            {
                field: 'stationName',
                operator: CondOperator.IN,
                value: targetStation,
            },
        ]);

        return this.stationService.findMany(qb).pipe(
            tap((stations: StationDetailsDto[]) => {
                this.operationRouteDiagramStateStore.setStations(
                    sortBy(stations, [
                        (station) =>
                            targetStation.findIndex(
                                (target) => station.stationName === target
                            ),
                    ])
                );
            }),
            map(() => undefined)
        );
    }
}
