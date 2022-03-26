import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { max } from 'lodash-es';
import { Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';

type State = {
    calendar: CalendarDetailsDto;
    stationName: StationDetailsDto['stationName'];
    tripDirection: TripDetailsDto['tripDirection'];
    tripClasses: TripClassDetailsDto[];
    stations: StationDetailsDto[];
    timetableData: {
        day: number;
        hour: string;
        trips: TripDetailsDto[];
    }[];
};

@Component({
    selector: 'app-timetable-station-table-p',
    templateUrl: './timetable-station-table-p.component.html',
    styleUrls: ['./timetable-station-table-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [RxState],
})
export class TimetableStationTablePComponent {
    readonly calendar$ = this.state.select('calendar');
    readonly stationName$ = this.state.select('stationName');
    readonly tripDirection$ = this.state.select('tripDirection');
    readonly tripClasses$ = this.state.select('tripClasses');
    readonly stations$ = this.state.select('stations');
    readonly timetableData$ = this.state.select('timetableData');
    readonly maxColumnsCount$ = this.state
        .select('timetableData')
        .pipe(map((data) => max(data.map((o) => o.trips.length))));

    readonly onChangedInputCalendar$ = new Subject<CalendarDetailsDto>();
    readonly onChangedInputStationName$ = new Subject<
        StationDetailsDto['stationName']
    >();
    readonly onChangedInputTripDirection$ = new Subject<
        TripDetailsDto['tripDirection']
    >();
    readonly onChangedInputTripClasses$ = new Subject<TripClassDetailsDto[]>();
    readonly onChangedInputStations$ = new Subject<StationDetailsDto[]>();
    readonly onChangedInputTimetableData$ = new Subject<
        {
            day: number;
            hour: string;
            trips: TripDetailsDto[];
        }[]
    >();

    @Input() set calendar(calendar: CalendarDetailsDto) {
        this.onChangedInputCalendar$.next(calendar);
    }
    @Input() set stationName(stationName: StationDetailsDto['stationName']) {
        this.onChangedInputStationName$.next(stationName);
    }
    @Input() set tripDirection(tripDirection: TripDetailsDto['tripDirection']) {
        this.onChangedInputTripDirection$.next(tripDirection);
    }
    @Input() set tripClasses(tripClasses: TripClassDetailsDto[]) {
        this.onChangedInputTripClasses$.next(tripClasses);
    }
    @Input() set stations(stations: StationDetailsDto[]) {
        this.onChangedInputStations$.next(stations);
    }

    @Input() set timetableData(
        data: {
            day: number;
            hour: string;
            trips: TripDetailsDto[];
        }[]
    ) {
        this.onChangedInputTimetableData$.next(data);
    }

    constructor(private readonly state: RxState<State>) {
        this.state.connect('calendar', this.onChangedInputCalendar$);
        this.state.connect('stationName', this.onChangedInputStationName$);
        this.state.connect('tripDirection', this.onChangedInputTripDirection$);
        this.state.connect('tripClasses', this.onChangedInputTripClasses$);
        this.state.connect('stations', this.onChangedInputStations$);
        this.state.connect('timetableData', this.onChangedInputTimetableData$);
    }
}
