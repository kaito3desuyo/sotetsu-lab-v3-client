import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import {
    IsActiveMatchOptions,
    RouterLink,
    RouterLinkActive,
} from '@angular/router';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';

@Component({
    selector: 'app-sidenav',
    templateUrl: './sidenav.component.html',
    styleUrls: ['./sidenav.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        RouterLink,
        RouterLinkActive,
        ReactiveFormsModule,
        MatListModule,
        MatFormFieldModule,
        MatSelectModule,
    ],
})
export class SidenavComponent {
    readonly #fb = inject(FormBuilder);
    readonly #todaysCalendarListStateQuery = inject(
        TodaysCalendarListStateQuery,
    );
    readonly #routeStationListStateQuery = inject(RouteStationListStateQuery);

    readonly stationId = this.#fb.control<string>('');

    /**
     * 上り/下りリンクの現在地判定オプション。
     *
     * 両者は同一パスで matrix パラメータ `trip_direction` だけが異なる。
     * `routerLinkActive` の既定は部分一致なので、matrix パラメータを持たない
     * `/timetable/all-line` が両方に一致し 2 件同時に光ってしまう。
     * かつ `{ exact: true }` は内部的に `matrixParams: 'ignored'` へ展開されるため
     * この区別には使えない。よって matrixParams まで exact を明示する。
     */
    readonly timetableLinkActiveOptions: IsActiveMatchOptions = {
        paths: 'exact',
        matrixParams: 'exact',
        queryParams: 'exact',
        fragment: 'ignored',
    };

    readonly todaysCalendarId = toSignal(
        this.#todaysCalendarListStateQuery.todaysCalendarId$,
    );
    readonly routeStations = toSignal(
        this.#routeStationListStateQuery.routeStations$,
    );
    readonly selectedStationId = toSignal(this.stationId.valueChanges);

    readonly inboundTimetableLink = computed(() => {
        const todaysCalendarId = this.todaysCalendarId();
        const selectedStationId = this.selectedStationId();

        return this.#generateTimetableLink({
            todaysCalendarId,
            selectedStationId,
            tripDirection: ETripDirection.INBOUND,
        });
    });
    readonly outboundTimetableLink = computed(() => {
        const todaysCalendarId = this.todaysCalendarId();
        const selectedStationId = this.selectedStationId();

        return this.#generateTimetableLink({
            todaysCalendarId,
            selectedStationId,
            tripDirection: ETripDirection.OUTBOUND,
        });
    });

    #generateTimetableLink(params: {
        todaysCalendarId: CalendarDetailsDto['calendarId'];
        selectedStationId: StationDetailsDto['stationId'];
        tripDirection: ETripDirection;
    }): [string, string, {}] {
        const { todaysCalendarId, selectedStationId, tripDirection } = params;

        if (selectedStationId) {
            return [
                '/timetable',
                'station',
                {
                    calendar_id: todaysCalendarId,
                    station_id: selectedStationId,
                    trip_direction: String(tripDirection),
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
    }
}
