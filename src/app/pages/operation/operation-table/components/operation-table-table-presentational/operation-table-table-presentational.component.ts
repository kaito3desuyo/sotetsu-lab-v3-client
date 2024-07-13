import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
} from '@angular/core';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';

// const COMPONENT_RX_ANGULAR_CONFIG: RxRenderStrategiesConfig<string> = {
//     primaryStrategy: 'normal',
//     patchZone: false,
// };

// type State = {
//     calendar: CalendarDetailsDto;
//     operationNumbers: string[];
//     operationTrips: OperationTripsDto[];
//     stations: StationDetailsDto[];
//     tripClasses: TripClassDetailsDto[];
// };

@Component({
    selector: 'app-operation-table-table-presentational',
    templateUrl: './operation-table-table-presentational.component.html',
    styleUrls: ['./operation-table-table-presentational.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    // providers: [
    //     {
    //         provide: RX_RENDER_STRATEGIES_CONFIG,
    //         useValue: COMPONENT_RX_ANGULAR_CONFIG,
    //     },
    //     RxState,
    // ],
})
export class OperationTableTablePresentationalComponent {
    // readonly vm$ = this.state.select();

    // readonly onChangedInputCalendar$ = new Subject<CalendarDetailsDto>();
    // readonly onChangedInputOperationNumbers$ = new Subject<string[]>();
    // readonly onChangedInputOperationTrips$ = new Subject<OperationTripsDto[]>();
    // readonly onChangedInputStations$ = new Subject<StationDetailsDto[]>();
    // readonly onChangedInputTripClasses$ = new Subject<TripClassDetailsDto[]>();

    // @Input() set calendar(calendar: CalendarDetailsDto) {
    //     this.onChangedInputCalendar$.next(calendar);
    // }
    // @Input() set operationNumbers(numbers: string[]) {
    //     this.onChangedInputOperationNumbers$.next(numbers);
    // }
    // @Input() set operationTrips(operationTrips: OperationTripsDto[]) {
    //     this.onChangedInputOperationTrips$.next(operationTrips);
    // }
    // @Input() set stations(stations: StationDetailsDto[]) {
    //     this.onChangedInputStations$.next(stations);
    // }
    // @Input() set tripClasses(tripClasses: TripClassDetailsDto[]) {
    //     this.onChangedInputTripClasses$.next(tripClasses);
    // }

    calendar = input.required<CalendarDetailsDto>();
    operationTrips = input.required<OperationTripsDto[]>();
    stations = input.required<StationDetailsDto[]>();
    tripClasses = input.required<TripClassDetailsDto[]>();

    isHolidayCalendar = computed(() => {
        const calendar = this.calendar();
        return calendar.sunday || calendar.saturday;
    });

    constructor() {
        // private readonly state: RxState<State>
        // this.state.connect(
        //     'calendar',
        //     this.onChangedInputCalendar$.asObservable()
        // );
        // this.state.connect(
        //     'operationNumbers',
        //     this.onChangedInputOperationNumbers$.asObservable()
        // );
        // this.state.connect(
        //     'operationTrips',
        //     this.onChangedInputOperationTrips$.asObservable()
        // );
        // this.state.connect(
        //     'stations',
        //     this.onChangedInputStations$.asObservable()
        // );
        // this.state.connect(
        //     'tripClasses',
        //     this.onChangedInputTripClasses$.asObservable()
        // );
    }
}
