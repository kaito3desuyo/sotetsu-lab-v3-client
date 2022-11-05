import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output,
} from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { RxState } from '@rx-angular/state';
import { Subject } from 'rxjs';
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

    readonly vm$ = this.state.select();

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
}
