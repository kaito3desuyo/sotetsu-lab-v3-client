import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import {
    RxRenderStrategiesConfig,
    RX_RENDER_STRATEGIES_CONFIG,
} from '@rx-angular/cdk/render-strategies';
import { RxState } from '@rx-angular/state';
import { combineLatest, Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { RouteDetailsDto } from 'src/app/libs/route/usecase/dtos/route-details.dto';

const COMPONENT_RX_ANGULAR_CONFIG: RxRenderStrategiesConfig<string> = {
    primaryStrategy: 'normal',
    patchZone: false,
};

type State = {
    todaysCalendarId: string;
    routeStations: RouteDetailsDto[];
    selectedStationId: string;
    upTimetableLink: (string | { [key: string]: any })[];
    downTimetableLink: (string | { [key: string]: any })[];
};

@Component({
    selector: 'app-sidenav-presentational',
    templateUrl: './sidenav-presentational.component.html',
    styleUrls: ['./sidenav-presentational.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: RX_RENDER_STRATEGIES_CONFIG,
            useValue: COMPONENT_RX_ANGULAR_CONFIG,
        },
        RxState,
    ],
})
export class SidenavPresentationalComponent {
    readonly stationId = this.fb.control<string>('');

    readonly vm$ = this.state.select();

    readonly onChangedInputTodaysCalendarId$ = new Subject<string>();
    readonly onChangedInputRouteStations$ = new Subject<RouteDetailsDto[]>();

    @Input() set todaysCalendarId(calendarId: string) {
        this.onChangedInputTodaysCalendarId$.next(calendarId);
    }
    @Input() set routeStations(route: RouteDetailsDto[]) {
        this.onChangedInputRouteStations$.next(route);
    }

    constructor(
        private readonly fb: FormBuilder,
        private readonly state: RxState<State>
    ) {
        this.state.set({
            selectedStationId: '',
        });

        this.state.connect(
            'todaysCalendarId',
            this.onChangedInputTodaysCalendarId$.asObservable()
        );
        this.state.connect(
            'routeStations',
            this.onChangedInputRouteStations$.asObservable()
        );

        this.state.connect('selectedStationId', this.stationId.valueChanges);
        this.state.connect('upTimetableLink', this._generateTimetableLink(0));
        this.state.connect('downTimetableLink', this._generateTimetableLink(1));
    }

    private _generateTimetableLink(
        tripDirection: 0 | 1
    ): Observable<(string | { [key: string]: any })[]> {
        return combineLatest([
            this.state.select('todaysCalendarId'),
            this.state.select('selectedStationId'),
        ]).pipe(
            map(([todaysCalendarId, selectedStationId]) => {
                if (selectedStationId) {
                    return [
                        '/timetable',
                        'station',
                        {
                            calendar_id: todaysCalendarId,
                            trip_direction: String(tripDirection),
                            station_id: selectedStationId,
                        },
                    ];
                } else {
                    return [
                        '/timetable',
                        'all-line',
                        {
                            calendar_id: todaysCalendarId,
                            trip_direction: String(tripDirection),
                        },
                    ];
                }
            })
        );
    }
}
