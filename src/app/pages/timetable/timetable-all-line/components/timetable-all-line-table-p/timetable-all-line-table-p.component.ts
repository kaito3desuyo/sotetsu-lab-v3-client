import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output,
} from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { RxState, stateful } from '@rx-angular/state';
import { combineLatest, Subject } from 'rxjs';
import { map, pluck } from 'rxjs/operators';
import { areArrayValuesEqual } from 'src/app/core/utils/are-array-values-equal';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { ETimetableStationViewMode } from '../../../general/interfaces/timetable-station';

type State = {
    calendar: CalendarDetailsDto;
    tripDirection: TripDetailsDto['tripDirection'];
    stations: StationDetailsDto[];
    trips: TripDetailsDto[];
    pageSettings: PageEvent;
    groupingBaseTrip: TripDetailsDto;
};

@Component({
    selector: 'app-timetable-all-line-table-p',
    templateUrl: './timetable-all-line-table-p.component.html',
    styleUrls: [
        './timetable-all-line-table-p.component.scss',
        '../../../../../../assets/fonts/DiaPro-web/DiaPro.css',
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [RxState],
})
export class TimetableAllLineTablePComponent {
    readonly staitonViewMode: typeof ETimetableStationViewMode =
        ETimetableStationViewMode;

    get groupingBaseTrip() {
        return this.state.get('groupingBaseTrip');
    }

    readonly calendar$ = this.state.select('calendar');
    readonly tripDirection$ = this.state.select('tripDirection');
    readonly stations$ = combineLatest([
        this.tripDirection$,
        this.state.select('stations'),
    ]).pipe(
        stateful(
            map(([tripDirection, stations]) => {
                return stations.map((o) => ({
                    ...o,
                    viewMode: this._getViewMode(o, tripDirection as 0 | 1),
                    borderSetting: this._getBorderSetting(
                        o,
                        tripDirection as 0 | 1
                    ),
                }));
            })
        )
    );
    readonly trips$ = this.state.select('trips');
    readonly pageSettings$ = this.state.select('pageSettings');
    readonly isEnableGroupingMode$ = this.state.select(
        pluck('groupingBaseTrip'),
        map((trip) => !!trip)
    );

    readonly onChangedInputCalendar$ = new Subject<CalendarDetailsDto>();
    readonly onChangedInputTripDirection$ = new Subject<
        TripDetailsDto['tripDirection']
    >();
    readonly onChangedInputStations$ = new Subject<StationDetailsDto[]>();
    readonly onChangedInputTrips$ = new Subject<TripDetailsDto[]>();
    readonly onChangedInputPageSettings$ = new Subject<PageEvent>();

    readonly onPaged$ = new Subject<PageEvent>();
    readonly onClickedEditButton$ = new Subject<TripDetailsDto>();
    readonly onClickedCopyButton$ = new Subject<TripDetailsDto>();
    readonly onClickedDeleteButton$ = new Subject<TripDetailsDto>();
    readonly onClickedGroupingButton$ = new Subject<TripDetailsDto>();
    readonly onClickedAddTripInGroup$ = new Subject<{
        base: TripDetailsDto;
        target: TripDetailsDto;
    }>();
    readonly onClickedDeleteTripInGroup$ = new Subject<{
        base: TripDetailsDto;
        target: TripDetailsDto;
    }>();

    @Input() set calendar(calendar: CalendarDetailsDto) {
        this.onChangedInputCalendar$.next(calendar);
    }
    @Input() set tripDirection(tripDirection: TripDetailsDto['tripDirection']) {
        this.onChangedInputTripDirection$.next(tripDirection);
    }
    @Input() set stations(stations: StationDetailsDto[]) {
        this.onChangedInputStations$.next(stations);
    }
    @Input() set trips(trips: TripDetailsDto[]) {
        this.onChangedInputTrips$.next(trips);
    }
    @Input() set pageSettings(pageSettings: PageEvent) {
        this.onChangedInputPageSettings$.next(pageSettings);
    }

    @Output() page = new EventEmitter<PageEvent>();
    @Output() clickEditButton = new EventEmitter<TripDetailsDto>();
    @Output() clickCopyButton = new EventEmitter<TripDetailsDto>();
    @Output() clickDeleteButton = new EventEmitter<TripDetailsDto>();
    @Output() clickAddTripInGroup = new EventEmitter<{
        base: TripDetailsDto;
        target: TripDetailsDto;
    }>();
    @Output() clickDeleteTripInGroup = new EventEmitter<{
        base: TripDetailsDto;
        target: TripDetailsDto;
    }>();

    constructor(private readonly state: RxState<State>) {
        this.state.set({
            pageSettings: {
                pageIndex: 0,
                pageSize: 10,
                length: 0,
            },
        });

        this.state.connect('calendar', this.onChangedInputCalendar$);
        this.state.connect('tripDirection', this.onChangedInputTripDirection$);
        this.state.connect('stations', this.onChangedInputStations$);
        this.state.connect('trips', this.onChangedInputTrips$);
        this.state.connect('pageSettings', this.onChangedInputPageSettings$);
        this.state.connect('groupingBaseTrip', this.onClickedGroupingButton$);

        this.state.hold(this.onPaged$, (pageSettings) => {
            this.page.emit(pageSettings);
        });
        this.state.hold(this.onClickedEditButton$, (trip) => {
            this.clickEditButton.emit(trip);
        });
        this.state.hold(this.onClickedCopyButton$, (trip) => {
            this.clickCopyButton.emit(trip);
        });
        this.state.hold(this.onClickedDeleteButton$, (trip) => {
            this.clickDeleteButton.emit(trip);
        });
        this.state.hold(this.onClickedAddTripInGroup$, ({ base, target }) => {
            this.clickAddTripInGroup.emit({ base, target });
        });
        this.state.hold(
            this.onClickedDeleteTripInGroup$,
            ({ base, target }) => {
                this.clickDeleteTripInGroup.emit({ base, target });
            }
        );
    }

    private _getViewMode(
        station: StationDetailsDto,
        tripDirection: 0 | 1
    ): ETimetableStationViewMode {
        if (tripDirection === 0) {
            const departureAndArrival = [
                { routeName: ['川越線', '埼京線'], stationName: '大宮' },
                { routeName: ['埼京線'], stationName: '新宿' },
                {
                    routeName: ['埼京線', '相鉄・JR直通線', 'りんかい線'],
                    stationName: '大崎',
                },
                {
                    routeName: ['三田線', '南北線', '目黒線'],
                    stationName: '目黒',
                },
                {
                    routeName: ['副都心線'],
                    stationName: '新宿三丁目',
                },
                { routeName: ['副都心線', '東横線'], stationName: '渋谷' },
                {
                    routeName: ['東横線', '目黒線', '東急新横浜線'],
                    stationName: '日吉',
                },
                {
                    routeName: ['東横線', 'みなとみらい線'],
                    stationName: '横浜',
                },
                { routeName: ['本線', '相鉄新横浜線'], stationName: '西谷' },
                { routeName: ['本線', 'いずみ野線'], stationName: '二俣川' },
                { routeName: ['いずみ野線'], stationName: 'いずみ野' },
                { routeName: ['本線'], stationName: '大和' },
            ];

            if (
                departureAndArrival.some(
                    (o) =>
                        station.stationName === o.stationName &&
                        areArrayValuesEqual(
                            station.routeStationLists.map(
                                (rsl) => rsl.route.routeName
                            ),
                            o.routeName
                        )
                )
            ) {
                return ETimetableStationViewMode.DEPARTURE_AND_ARRIVAL;
            }

            const onlyInboundArrival = [
                { routeName: ['川越線'], stationName: '川越' },
                { routeName: ['三田線'], stationName: '西高島平' },
                { routeName: ['埼玉高速鉄道線'], stationName: '浦和美園' },
                { routeName: ['有楽町線', '副都心線'], stationName: '和光市' },
                { routeName: ['本線'], stationName: '横浜' },
            ];

            if (
                onlyInboundArrival.some(
                    (o) =>
                        station.stationName === o.stationName &&
                        areArrayValuesEqual(
                            station.routeStationLists.map(
                                (rsl) => rsl.route.routeName
                            ),
                            o.routeName
                        )
                )
            ) {
                return ETimetableStationViewMode.ONLY_INBOUND_ARRIVAL;
            }

            return ETimetableStationViewMode.ONLY_DEPARTURE;
        } else if (tripDirection === 1) {
            const departureAndArrival = [
                { routeName: ['川越線', '埼京線'], stationName: '大宮' },
                { routeName: ['埼京線'], stationName: '新宿' },
                {
                    routeName: ['埼京線', '相鉄・JR直通線', 'りんかい線'],
                    stationName: '大崎',
                },
                {
                    routeName: ['三田線', '南北線', '目黒線'],
                    stationName: '目黒',
                },
                {
                    routeName: ['副都心線'],
                    stationName: '新宿三丁目',
                },
                { routeName: ['副都心線', '東横線'], stationName: '渋谷' },
                {
                    routeName: ['東横線', '目黒線', '東急新横浜線'],
                    stationName: '日吉',
                },
                {
                    routeName: ['東横線', 'みなとみらい線'],
                    stationName: '横浜',
                },
                { routeName: ['本線', '相鉄新横浜線'], stationName: '西谷' },
                { routeName: ['本線', 'いずみ野線'], stationName: '二俣川' },
                { routeName: ['いずみ野線'], stationName: 'いずみ野' },
                { routeName: ['本線'], stationName: '大和' },
            ];

            if (
                departureAndArrival.some(
                    (o) =>
                        station.stationName === o.stationName &&
                        areArrayValuesEqual(
                            station.routeStationLists.map(
                                (rsl) => rsl.route.routeName
                            ),
                            o.routeName
                        )
                )
            ) {
                return ETimetableStationViewMode.DEPARTURE_AND_ARRIVAL;
            }

            const onlyOutboundArrival = [
                { routeName: ['りんかい線'], stationName: '新木場' },
                { routeName: ['有楽町線'], stationName: '新木場' },
                { routeName: ['みなとみらい線'], stationName: '元町・中華街' },
                { routeName: ['いずみ野線'], stationName: '湘南台' },
                { routeName: ['本線'], stationName: '海老名' },
                { routeName: ['厚木線'], stationName: '厚木' },
            ];

            if (
                onlyOutboundArrival.some(
                    (o) =>
                        station.stationName === o.stationName &&
                        areArrayValuesEqual(
                            station.routeStationLists.map(
                                (rsl) => rsl.route.routeName
                            ),
                            o.routeName
                        )
                )
            ) {
                return ETimetableStationViewMode.ONLY_OUTBOUND_ARRIVAL;
            }

            return ETimetableStationViewMode.ONLY_DEPARTURE;
        } else {
            return null;
        }
    }

    private _getBorderSetting(
        station: StationDetailsDto,
        tripDirection: 0 | 1
    ): boolean {
        if (tripDirection === 0) {
            const target = [
                { routeName: ['三田線'], stationName: '西高島平' },
                { routeName: ['埼玉高速鉄道線'], stationName: '浦和美園' },
                { routeName: ['有楽町線', '副都心線'], stationName: '和光市' },
                { routeName: ['副都心線'], stationName: '千川' },
                { routeName: ['東横線'], stationName: '綱島' },
                { routeName: ['本線'], stationName: '横浜' },
                { routeName: ['本線'], stationName: '希望ヶ丘' },
                { routeName: ['厚木線'], stationName: '厚木' },
            ];

            if (
                target.some(
                    (o) =>
                        station.stationName === o.stationName &&
                        areArrayValuesEqual(
                            station.routeStationLists.map(
                                (rsl) => rsl.route.routeName
                            ),
                            o.routeName
                        )
                )
            ) {
                return true;
            }

            return false;
        } else if (tripDirection === 1) {
            const target = [
                { routeName: ['相鉄・JR直通線'], stationName: '武蔵小杉' },
                { routeName: ['りんかい線'], stationName: '新木場' },
                { routeName: ['三田線'], stationName: '三田' },
                { routeName: ['目黒線'], stationName: '奥沢' },
                { routeName: ['有楽町線'], stationName: '新木場' },
                {
                    routeName: ['相鉄新横浜線', '相鉄・JR直通線'],
                    stationName: '羽沢横浜国大',
                },
                {
                    routeName: ['みなとみらい線'],
                    stationName: '元町・中華街',
                },
                { routeName: ['いずみ野線'], stationName: '湘南台' },
                { routeName: ['本線'], stationName: '海老名' },
            ];

            if (
                target.some(
                    (o) =>
                        station.stationName === o.stationName &&
                        areArrayValuesEqual(
                            station.routeStationLists.map(
                                (rsl) => rsl.route.routeName
                            ),
                            o.routeName
                        )
                )
            ) {
                return true;
            }

            return false;
        } else {
            return false;
        }
    }
}
