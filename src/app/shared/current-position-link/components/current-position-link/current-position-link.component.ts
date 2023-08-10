import { RxPush } from '@rx-angular/template/push';
import { RxLet } from '@rx-angular/template/let';
import { RxIf } from '@rx-angular/template/if';
import { RxFor } from '@rx-angular/template/for';
import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    Input,
    inject,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import {
    RX_RENDER_STRATEGIES_CONFIG,
    RxRenderStrategiesConfig,
} from '@rx-angular/cdk/render-strategies';
import { RxState, selectSlice } from '@rx-angular/state';
import { Subject } from 'rxjs';
import { map, pluck } from 'rxjs/operators';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationCurrentPositionDto } from 'src/app/libs/operation/usecase/dtos/operation-current-position.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';

const COMPONENT_RX_ANGULAR_CONFIG: RxRenderStrategiesConfig<string> = {
    primaryStrategy: 'immediate',
    patchZone: false,
};

type State = {
    todaysCalendarId: CalendarDetailsDto['calendarId'];
    stations: StationDetailsDto[];
    tripClasses: TripClassDetailsDto[];
    prevTrip: OperationCurrentPositionDto['position']['prev'];
    currentTrip: OperationCurrentPositionDto['position']['current'];
    nextTrip: OperationCurrentPositionDto['position']['next'];
    isBeforeDepotOut: boolean;
    isRunning: boolean;
    isGapTime: boolean;
    isAfterDepotIn: boolean;
    context: {
        todaysCalendarId: CalendarDetailsDto['calendarId'];
        stations: StationDetailsDto[];
        tripClasses: TripClassDetailsDto[];
        trip?: TripDetailsDto;
        hiddenTrip?: TripDetailsDto;
        leftTime?: TimeDetailsDto;
        leftTimeKey?: string;
        rightTime?: TimeDetailsDto;
        rightTimeKey?: string;
    };
};

@Component({
    standalone: true,
    selector: 'app-current-position-link',
    templateUrl: './current-position-link.component.html',
    styleUrls: ['./current-position-link.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        RouterModule,
        MatIconModule,
        RxLet,
        RxFor,
        RxIf,
        RxPush,
        PipesModule,
    ],
    providers: [
        {
            provide: RX_RENDER_STRATEGIES_CONFIG,
            useValue: COMPONENT_RX_ANGULAR_CONFIG,
        },
        RxState,
    ],
})
export class CurrentPositionLinkComponent {
    private readonly state = inject<RxState<State>>(RxState);

    readonly isBeforeDepotOut$ = this.state.select('isBeforeDepotOut');
    readonly isAfterDepotIn$ = this.state.select('isAfterDepotIn');
    readonly isRunning$ = this.state.select('isRunning');
    readonly isGapTime$ = this.state.select('isGapTime');
    readonly context$ = this.state.select('context');

    private readonly onChangedInputTodaysCalendarId$ = new Subject<
        CalendarDetailsDto['calendarId']
    >();
    private readonly onChangedInputStations$ = new Subject<
        StationDetailsDto[]
    >();
    private readonly onChangedInputTripClasses$ = new Subject<
        TripClassDetailsDto[]
    >();
    private readonly onChangedInputCurrentPosition$ =
        new Subject<OperationCurrentPositionDto>();

    @Input() set todaysCalendarId(
        calendarId: CalendarDetailsDto['calendarId']
    ) {
        this.onChangedInputTodaysCalendarId$.next(calendarId);
    }

    @Input() set stations(stations: StationDetailsDto[]) {
        this.onChangedInputStations$.next(stations);
    }

    @Input() set tripClasses(tripClasses: TripClassDetailsDto[]) {
        this.onChangedInputTripClasses$.next(tripClasses);
    }

    @Input() set currentPosition(position: OperationCurrentPositionDto) {
        this.onChangedInputCurrentPosition$.next(position);
    }

    constructor() {
        this.state.connect(
            'todaysCalendarId',
            this.onChangedInputTodaysCalendarId$.asObservable()
        );

        this.state.connect(
            'stations',
            this.onChangedInputStations$.asObservable()
        );

        this.state.connect(
            'tripClasses',
            this.onChangedInputTripClasses$.asObservable()
        );

        this.state.connect(
            'prevTrip',
            this.onChangedInputCurrentPosition$
                .asObservable()
                .pipe(pluck('position', 'prev'))
        );

        this.state.connect(
            'currentTrip',
            this.onChangedInputCurrentPosition$
                .asObservable()
                .pipe(pluck('position', 'current'))
        );

        this.state.connect(
            'nextTrip',
            this.onChangedInputCurrentPosition$
                .asObservable()
                .pipe(pluck('position', 'next'))
        );

        this.state.connect(
            'isBeforeDepotOut',
            this.state
                .select(selectSlice(['prevTrip', 'currentTrip', 'nextTrip']))
                .pipe(
                    map(
                        ({ prevTrip, currentTrip, nextTrip }) =>
                            !prevTrip && !currentTrip && !!nextTrip
                    )
                )
        );

        this.state.connect(
            'isRunning',
            this.state
                .select(selectSlice(['prevTrip', 'currentTrip', 'nextTrip']))
                .pipe(
                    map(
                        ({ prevTrip, currentTrip, nextTrip }) =>
                            !prevTrip && !!currentTrip && !nextTrip
                    )
                )
        );

        this.state.connect(
            'isGapTime',
            this.state
                .select(selectSlice(['prevTrip', 'currentTrip', 'nextTrip']))
                .pipe(
                    map(
                        ({ prevTrip, currentTrip, nextTrip }) =>
                            !!prevTrip && !currentTrip && !!nextTrip
                    )
                )
        );

        this.state.connect(
            'isAfterDepotIn',
            this.state
                .select(selectSlice(['prevTrip', 'currentTrip', 'nextTrip']))
                .pipe(
                    map(
                        ({ prevTrip, currentTrip, nextTrip }) =>
                            !!prevTrip && !currentTrip && !nextTrip
                    )
                )
        );

        this.state.connect(
            'context',
            this.state
                .select(
                    selectSlice([
                        'todaysCalendarId',
                        'stations',
                        'tripClasses',
                        'prevTrip',
                        'currentTrip',
                        'nextTrip',
                    ])
                )
                .pipe(
                    map(
                        ({
                            todaysCalendarId,
                            stations,
                            tripClasses,
                            prevTrip,
                            currentTrip,
                            nextTrip,
                        }) => {
                            if (!prevTrip && !currentTrip && !!nextTrip) {
                                return {
                                    todaysCalendarId: todaysCalendarId,
                                    stations: stations,
                                    tripClasses: tripClasses,
                                    trip: undefined,
                                    hiddenTrip: nextTrip?.trip,
                                    leftTime: undefined,
                                    leftTimeKey: undefined,
                                    rightTime: nextTrip?.startTime,
                                    rightTimeKey: 'departureTime',
                                };
                            }

                            if (!prevTrip && !!currentTrip && !nextTrip) {
                                return {
                                    todaysCalendarId: todaysCalendarId,
                                    stations: stations,
                                    tripClasses: tripClasses,
                                    trip: currentTrip?.trip,
                                    hiddenTrip: undefined,
                                    leftTime: currentTrip?.startTime,
                                    leftTimeKey: 'departureTime',
                                    rightTime: currentTrip?.endTime,
                                    rightTimeKey: 'arrivalTime',
                                };
                            }

                            if (!!prevTrip && !currentTrip && !!nextTrip) {
                                return {
                                    todaysCalendarId: todaysCalendarId,
                                    stations: stations,
                                    tripClasses: tripClasses,
                                    trip: undefined,
                                    hiddenTrip: prevTrip?.trip,
                                    leftTime: prevTrip?.endTime,
                                    leftTimeKey: 'arrivalTime',
                                    rightTime: nextTrip?.startTime,
                                    rightTimeKey: 'departureTime',
                                };
                            }

                            if (!!prevTrip && !currentTrip && !nextTrip) {
                                return {
                                    todaysCalendarId: todaysCalendarId,
                                    stations: stations,
                                    tripClasses: tripClasses,
                                    trip: undefined,
                                    hiddenTrip: prevTrip?.trip,
                                    leftTime: prevTrip?.endTime,
                                    leftTimeKey: 'arrivalTime',
                                    rightTime: undefined,
                                    rightTimeKey: undefined,
                                };
                            }

                            return undefined;
                        }
                    )
                )
        );
    }
}
