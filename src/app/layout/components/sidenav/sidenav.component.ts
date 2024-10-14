import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatRippleModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';

@Component({
    standalone: true,
    selector: 'app-sidenav',
    templateUrl: './sidenav.component.html',
    styleUrls: ['./sidenav.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        RouterLink,
        ReactiveFormsModule,
        MatRippleModule,
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
