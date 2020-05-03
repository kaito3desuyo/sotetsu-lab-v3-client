import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, zip } from 'rxjs';
import {
    ITimetableStation,
    ETimetableStationViewMode,
} from '../interfaces/timetable-station';
import { IService } from 'src/app/general/interfaces/service';
import { ServiceApiService } from 'src/app/general/api/service-api.service';
import { map, tap, flatMap } from 'rxjs/operators';
import { ServiceModel } from 'src/app/general/models/service/service-model';
import { StationModel } from 'src/app/general/models/station/station-model';
import { ITrip } from 'src/app/general/interfaces/trip';
import { PageEvent } from '@angular/material/paginator';
import { TripApiService } from 'src/app/general/api/trip-api.service';
import { TripBlockModel } from 'src/app/general/models/trip-block/trip-block-model';
import { concat, find } from 'lodash-es';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import { CalendarApiService } from 'src/app/general/api/calendar-api.service';
import { CalendarModel } from 'src/app/general/models/calendar/calendar-model';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogContainerComponent } from 'src/app/general/components/confirm-dialog-container/confirm-dialog-container.component';
import { NotificationService } from 'src/app/general/services/notification.service';
import moment from 'moment';
import { ITripBlock } from 'src/app/general/models/trip-block/trip-block';

@Injectable()
export class TimetableAllLineService {
    private calendarId: BehaviorSubject<string> = new BehaviorSubject<string>(
        null
    );

    private calendar: BehaviorSubject<ICalendar> = new BehaviorSubject<
        ICalendar
    >(null);

    private tripDirection: BehaviorSubject<'0' | '1'> = new BehaviorSubject<
        '0' | '1'
    >(null);

    private blockId: BehaviorSubject<string> = new BehaviorSubject<string>(
        null
    );

    private service: BehaviorSubject<IService> = new BehaviorSubject<IService>(
        null
    );

    private stations: BehaviorSubject<
        ITimetableStation[]
    > = new BehaviorSubject<ITimetableStation[]>([]);

    private _trips$: BehaviorSubject<ITrip[]> = new BehaviorSubject<ITrip[]>(
        []
    );
    trips$: Observable<ITrip[]> = this._trips$.asObservable();

    private _tripBlocks$: BehaviorSubject<ITripBlock[]> = new BehaviorSubject<
        ITripBlock[]
    >([]);
    tripBlocks$: Observable<ITripBlock[]> = this._tripBlocks$.asObservable();

    private pageSetting: BehaviorSubject<PageEvent> = new BehaviorSubject<
        PageEvent
    >({
        length: 0,
        pageIndex: 0,
        pageSize: 10,
    });

    private groupingBaseTrip: BehaviorSubject<ITrip> = new BehaviorSubject<
        ITrip
    >(null);

    constructor(
        private dialog: MatDialog,
        private notificationService: NotificationService,
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

    fetchCalendar(): Observable<void> {
        return this.calendarApi
            .getCalendarById(this.getCalendarIdAsStatic())
            .pipe(
                map((data) => CalendarModel.readCalendarDtoImpl(data.calendar)),
                tap((data) => {
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

    getBlockId(): Observable<string> {
        return this.blockId.asObservable();
    }

    getBlockIdAsStatic(): string {
        return this.blockId.getValue();
    }

    setBlockId(id: string): void {
        this.blockId.next(id);
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
                service_name:
                    '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線',
            })
            .pipe(
                map((data) => {
                    return ServiceModel.readServiceDtoImpl(data.services[0]);
                }),
                tap((data) => {
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

    fetchStations(): Observable<void> {
        return this.serviceApi
            .getServiceStationsById(this.getServiceAsStatic().id, {
                trip_direction: this.getTripDirectionAsStatic(),
            })
            .pipe(
                map((data) => {
                    return data.stations.map((result) =>
                        StationModel.readStationDtoImpl(result)
                    );
                }),
                tap((data) => {
                    this.setStations(
                        data.map((station) => ({
                            ...station,
                            viewMode: this.getViewMode(
                                station.stationName,
                                this.getTripDirectionAsStatic()
                            ),
                            borderSetting: this.getBorderSetting(
                                station.stationName,
                                this.getTripDirectionAsStatic()
                            ),
                        }))
                    );
                }),
                map(() => null)
            );
    }

    /*
    getTrips(): Observable<ITrip[]> {
        return this.trips.asObservable();
    }
    */

    getTripsSorted(): Observable<ITrip[]> {
        return zip(this.getStations(), this.tripBlocks$).pipe(
            map(([stations, tripBlocks]) => {
                // console.log(stations, tripBlocks);

                const sorted: ITripBlock[] = [];
                const unsorted: ITripBlock[] = tripBlocks;

                unsorted: for (const unsortedTripBlock of unsorted) {
                    if (!sorted.length) {
                        sorted.push(unsortedTripBlock);
                        continue;
                    }

                    let count = 0;
                    unsortedTrip: for (const unsortedTrip of unsortedTripBlock.trips) {
                        // console.log('unsortedTrip', unsortedTrip.tripNumber);

                        if (
                            (this.getTripDirectionAsStatic() === '0' &&
                                count !== 0) ||
                            (this.getTripDirectionAsStatic() === '1' &&
                                count !== unsortedTripBlock.trips.length - 1)
                        ) {
                            count++;
                            continue;
                        }

                        sorted: for (let i = 0; i < sorted.length; i++) {
                            const latestTripBlock =
                                sorted[sorted.length - (i + 1)];

                            sortedTrip: for (const latestTrip of latestTripBlock.trips) {
                                /*
                                console.log(
                                    'sortedTrip',
                                    latestTrip.tripNumber
                                );
                                */

                                station: for (const station of stations) {
                                    const sortTargetTime = find(
                                        unsortedTrip.times,
                                        (time) => time.stationId === station.id
                                    );

                                    if (!sortTargetTime) {
                                        continue;
                                    }

                                    const latestTripTime = find(
                                        latestTrip.times,
                                        (time) => time.stationId === station.id
                                    );

                                    if (!latestTripTime) {
                                        continue;
                                    }

                                    const format = 'HH:mm:dd';

                                    /*
                                    console.log(
                                        'time',
                                        latestTripTime,
                                        sortTargetTime
                                    );
                                    */

                                    if (
                                        moment(
                                            latestTripTime.departureTime,
                                            format
                                        ).add(
                                            latestTripTime.departureDays,
                                            'days'
                                        ) >
                                            moment(
                                                sortTargetTime.departureTime,
                                                format
                                            ).add(
                                                sortTargetTime.departureDays,
                                                'days'
                                            ) ||
                                        moment(
                                            latestTripTime.arrivalTime,
                                            format
                                        ).add(
                                            latestTripTime.arrivalDays,
                                            'days'
                                        ) >
                                            moment(
                                                sortTargetTime.departureTime,
                                                format
                                            ).add(
                                                sortTargetTime.departureDays,
                                                'days'
                                            ) ||
                                        moment(
                                            latestTripTime.departureTime,
                                            format
                                        ).add(
                                            latestTripTime.departureDays,
                                            'days'
                                        ) >
                                            moment(
                                                sortTargetTime.arrivalTime,
                                                format
                                            ).add(
                                                sortTargetTime.arrivalDays,
                                                'days'
                                            ) ||
                                        moment(
                                            latestTripTime.arrivalTime,
                                            format
                                        ).add(
                                            latestTripTime.arrivalDays,
                                            'days'
                                        ) >
                                            moment(
                                                sortTargetTime.arrivalTime,
                                                format
                                            ).add(
                                                sortTargetTime.arrivalDays,
                                                'days'
                                            )
                                    ) {
                                        if (i === sorted.length - 1) {
                                            sorted.unshift(unsortedTripBlock);
                                            break sorted;
                                        }

                                        continue sorted;
                                    }

                                    if (
                                        moment(
                                            latestTripTime.departureTime,
                                            format
                                        ).add(
                                            latestTripTime.departureDays,
                                            'days'
                                        ) <=
                                            moment(
                                                sortTargetTime.departureTime,
                                                format
                                            ).add(
                                                sortTargetTime.departureDays,
                                                'days'
                                            ) ||
                                        moment(
                                            latestTripTime.arrivalTime,
                                            format
                                        ).add(
                                            latestTripTime.arrivalDays,
                                            'days'
                                        ) <=
                                            moment(
                                                sortTargetTime.departureTime,
                                                format
                                            ).add(
                                                sortTargetTime.departureDays,
                                                'days'
                                            ) ||
                                        moment(
                                            latestTripTime.departureTime,
                                            format
                                        ).add(
                                            latestTripTime.departureDays,
                                            'days'
                                        ) <=
                                            moment(
                                                sortTargetTime.arrivalTime,
                                                format
                                            ).add(
                                                sortTargetTime.arrivalDays,
                                                'days'
                                            ) ||
                                        moment(
                                            latestTripTime.arrivalTime,
                                            format
                                        ).add(
                                            latestTripTime.arrivalDays,
                                            'days'
                                        ) <=
                                            moment(
                                                sortTargetTime.arrivalTime,
                                                format
                                            ).add(
                                                sortTargetTime.arrivalDays,
                                                'days'
                                            )
                                    ) {
                                        sorted.splice(
                                            sorted.length - i,
                                            0,
                                            unsortedTripBlock
                                        );

                                        break sorted;
                                    }

                                    continue;
                                }
                            }

                            if (i === sorted.length - 1) {
                                sorted.unshift(unsortedTripBlock);
                                break sorted;
                            }
                        }

                        count++;
                    }
                }

                return sorted;
            }),
            map((data) => {
                let trips: ITrip[] = [];
                data.forEach((tripBlock) => {
                    trips = concat(trips, tripBlock.trips);
                });
                return trips;
            })
        );
    }

    getTripsByPage(): Observable<ITrip[]> {
        return combineLatest([
            this.getTripsSorted(),
            this.getPageSetting(),
        ]).pipe(
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
        this._trips$.next(trips);
    }

    fetchTrips() {
        const blockId = this.getBlockIdAsStatic();

        const params: {
            calendar_id?: string;
            trip_direction?: '0' | '1';
            trip_block_id?: string;
        } = {
            calendar_id: this.getCalendarIdAsStatic(),
            trip_direction: this.getTripDirectionAsStatic(),
        };

        if (blockId) {
            params.trip_block_id = blockId;
        }

        return this.tripApi.searchTripsByBlocks(params).pipe(
            map((data) =>
                data.trip_blocks.map((tripBlock) =>
                    TripBlockModel.readTripBlockDtoImpl(tripBlock)
                )
            ),
            tap((data) => {
                this._tripBlocks$.next(data);
                let trips: ITrip[] = [];
                data.forEach((tripBlock) => {
                    trips = concat(trips, tripBlock.trips);
                });
                this.setTrips(trips);
                this.updatePageSetting({
                    length: trips.length,
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
            ...setting,
        });
    }

    getGroupingBaseTrip(): Observable<ITrip> {
        return this.groupingBaseTrip.asObservable();
    }

    getGroupingBaseTripAsStatic(): ITrip {
        return this.groupingBaseTrip.getValue();
    }

    setGroupingBaseTrip(trip: ITrip): void {
        this.groupingBaseTrip.next(trip);
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
                case '厚木':
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
                case '海老名':
                    return true;
                default:
                    return false;
            }
        } else {
            return false;
        }
    }

    deleteTripById(trip: ITrip): void {
        const dialogRef = this.dialog.open(ConfirmDialogContainerComponent, {
            width: '480px',
            data: {
                title: '列車を削除する',
                text: `${trip.tripNumber}列車を削除しますか？この操作は元に戻すことができません。`,
                cancelButtonText: 'キャンセル',
                goButtonText: '削除する',
                goButtonColor: 'warn',
            },
        });

        dialogRef.afterClosed().subscribe((done) => {
            if (done) {
                this.tripApi
                    .deleteTripById(trip.id)
                    .pipe(flatMap(() => this.fetchTrips()))
                    .subscribe(
                        () => {
                            this.notificationService.open('削除しました', 'OK');
                        },
                        (error) => {
                            this.notificationService.open(
                                'エラーが発生しました',
                                'OK'
                            );
                        }
                    );
            }
        });
    }

    addTripInBaseTripBlock(targetTrip: ITrip): void {
        const baseTrip = this.getGroupingBaseTripAsStatic();

        const dialogRef = this.dialog.open(ConfirmDialogContainerComponent, {
            width: '480px',
            data: {
                title: 'グループに追加する',
                text: `${targetTrip.tripNumber}列車を${baseTrip.tripNumber}列車が所属するグループに追加しますか？`,
                cancelButtonText: 'キャンセル',
                goButtonText: '追加する',
                goButtonColor: 'primary',
            },
        });

        dialogRef.afterClosed().subscribe((done) => {
            if (done) {
                this.tripApi
                    .addTripToTripBlockById(targetTrip.id, baseTrip.tripBlockId)
                    .pipe(flatMap(() => this.fetchTrips()))
                    .subscribe(
                        () => {
                            this.setGroupingBaseTrip(null);
                            this.notificationService.open(
                                'グループに追加しました',
                                'OK'
                            );
                        },
                        (error) => {
                            this.notificationService.open(
                                'エラーが発生しました',
                                'OK'
                            );
                        }
                    );
            }
        });
    }

    removeTripInBaseTripBlock(targetTrip: ITrip): void {
        const baseTrip = this.getGroupingBaseTripAsStatic();

        const dialogRef = this.dialog.open(ConfirmDialogContainerComponent, {
            width: '480px',
            data: {
                title: 'グループから除外する',
                text: `${targetTrip.tripNumber}列車を${baseTrip.tripNumber}列車が所属するグループから除外しますか？`,
                cancelButtonText: 'キャンセル',
                goButtonText: '除外する',
                goButtonColor: 'warn',
            },
        });

        dialogRef.afterClosed().subscribe((done) => {
            if (done) {
                this.tripApi
                    .removeTripFromTripBlockById(targetTrip.id)
                    .pipe(flatMap(() => this.fetchTrips()))
                    .subscribe(
                        () => {
                            this.setGroupingBaseTrip(null);
                            this.notificationService.open(
                                'グループから除外しました',
                                'OK'
                            );
                        },
                        (error) => {
                            this.notificationService.open(
                                'エラーが発生しました',
                                'OK'
                            );
                        }
                    );
            }
        });
    }
}
