import { RxPush } from '@rx-angular/template/push';
import { RxLet } from '@rx-angular/template/let';
import { RxIf } from '@rx-angular/template/if';
import { RxFor } from '@rx-angular/template/for';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatRippleModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule } from '@angular/router';
import { RxState } from '@rx-angular/state';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { RouteDetailsDto } from 'src/app/libs/route/usecase/dtos/route-details.dto';

type State = {
    todaysCalendarId: string;
    routeStations: RouteDetailsDto[];
    selectedStationId: string;
    upTimetableLink: (string | { [key: string]: any })[];
    downTimetableLink: (string | { [key: string]: any })[];
};

@Component({
    standalone: true,
    selector: 'app-sidenav',
    templateUrl: './sidenav.component.html',
    styleUrls: ['./sidenav.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [RxState],
    imports: [
        CommonModule,
        RouterModule,
        ReactiveFormsModule,
        MatRippleModule,
        MatFormFieldModule,
        MatSelectModule,
        RxLet,
        RxFor,
        RxIf,
        RxPush,
    ],
})
export class SidenavComponent {
    private readonly fb = inject(FormBuilder);
    private readonly state = inject<RxState<State>>(RxState);
    private readonly todaysCalendarListStateQuery = inject(
        TodaysCalendarListStateQuery,
    );
    private readonly routeStationListStateQuery = inject(
        RouteStationListStateQuery,
    );

    readonly stationId = this.fb.control<string>('');
    readonly todaysCalendarId$ = this.state.select('todaysCalendarId');
    readonly routeStations$ = this.state.select('routeStations');
    readonly upTimetableLink$ = this.state.select('upTimetableLink');
    readonly downTimetableLink$ = this.state.select('downTimetableLink');

    constructor() {
        this.state.set({
            selectedStationId: '',
        });

        this.state.connect(
            'todaysCalendarId',
            this.todaysCalendarListStateQuery.todaysCalendarId$,
        );

        this.state.connect(
            'routeStations',
            this.routeStationListStateQuery.routeStations$,
        );

        this.state.connect('selectedStationId', this.stationId.valueChanges);
        this.state.connect('upTimetableLink', this._generateTimetableLink(0));
        this.state.connect('downTimetableLink', this._generateTimetableLink(1));
    }

    private _generateTimetableLink(
        tripDirection: 0 | 1,
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
            }),
        );
    }
}
