import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output,
} from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { RxState, stateful } from '@rx-angular/state';
import { Subject, zip } from 'rxjs';
import { map, pluck } from 'rxjs/operators';
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
    readonly stations$ = zip(
        this.tripDirection$,
        this.state.select('stations')
    ).pipe(
        stateful(
            map(([tripDirection, stations]) => {
                return stations.map((o) => ({
                    ...o,
                    viewMode: this._getViewMode(
                        o.stationName,
                        tripDirection as 0 | 1
                    ),
                    borderSetting: this._getBorderSetting(
                        o.stationName,
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
        stationName: string,
        tripDirection: 0 | 1
    ): ETimetableStationViewMode {
        if (tripDirection === 0) {
            switch (stationName) {
                case '大和':
                case 'いずみ野':
                case '二俣川':
                case '西谷':
                case '新宿':
                case '大宮':
                    return ETimetableStationViewMode.DEPARTURE_AND_ARRIVAL;
                case '横浜':
                case '川越':
                    return ETimetableStationViewMode.ONLY_INBOUND_ARRIVAL;
                default:
                    return ETimetableStationViewMode.ONLY_DEPARTURE;
            }
        } else if (tripDirection === 1) {
            switch (stationName) {
                case '大宮':
                case '新宿':
                case '西谷':
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

    private _getBorderSetting(
        stationName: string,
        tripDirection: 0 | 1
    ): boolean {
        if (tripDirection === 0) {
            switch (stationName) {
                case '厚木':
                case '希望ヶ丘':
                case '横浜':
                    return true;
                default:
                    return false;
            }
        } else if (tripDirection === 1) {
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
}
