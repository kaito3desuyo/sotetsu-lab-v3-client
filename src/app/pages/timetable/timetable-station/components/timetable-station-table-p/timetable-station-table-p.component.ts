import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { max } from 'lodash-es';
import { Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationSightingWithCirculatedDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-with-circulated.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
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
    operations: OperationDetailsDto[];
    formations: FormationDetailsDto[];
    latestSightings: OperationSightingWithCirculatedDto[];
    maxColumnsCount: number;
};

@Component({
    selector: 'app-timetable-station-table-p',
    templateUrl: './timetable-station-table-p.component.html',
    styleUrls: ['./timetable-station-table-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [RxState],
})
export class TimetableStationTablePComponent {
    readonly vm$ = this.state.select();

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
    readonly onChangedInputOperations$ = new Subject<OperationDetailsDto[]>();
    readonly onChangedInputFormations$ = new Subject<FormationDetailsDto[]>();
    readonly onChangedInputLatestSightings$ = new Subject<
        OperationSightingWithCirculatedDto[]
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
    @Input() set operations(operations: OperationDetailsDto[]) {
        this.onChangedInputOperations$.next(operations);
    }
    @Input() set formations(formations: FormationDetailsDto[]) {
        this.onChangedInputFormations$.next(formations);
    }
    @Input() set latestSightings(
        sightings: OperationSightingWithCirculatedDto[]
    ) {
        this.onChangedInputLatestSightings$.next(sightings);
    }

    constructor(private readonly state: RxState<State>) {
        this.state.connect('calendar', this.onChangedInputCalendar$);
        this.state.connect('stationName', this.onChangedInputStationName$);
        this.state.connect('tripDirection', this.onChangedInputTripDirection$);
        this.state.connect('tripClasses', this.onChangedInputTripClasses$);
        this.state.connect('stations', this.onChangedInputStations$);
        this.state.connect('timetableData', this.onChangedInputTimetableData$);
        this.state.connect('operations', this.onChangedInputOperations$);
        this.state.connect('formations', this.onChangedInputFormations$);
        this.state.connect(
            'latestSightings',
            this.onChangedInputLatestSightings$
        );
        this.state.connect(
            'maxColumnsCount',
            this.state
                .select('timetableData')
                .pipe(map((data) => max(data.map((o) => o.trips.length))))
        );
    }
}
