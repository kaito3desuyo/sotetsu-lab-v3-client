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
import { AgencyListState } from 'src/app/global-states/agency-list.state';
import { RouteStationListState } from 'src/app/global-states/route-station-list.state';
import { TodaysCalendarListState } from 'src/app/global-states/todays-calendar-list.state';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';
import { LazyOptionsDirective } from 'src/app/shared/lazy-options/lazy-options.directive';
import { buildStationGroups } from 'src/app/shared/station-groups.util';

@Component({
    selector: 'app-sidenav',
    templateUrl: './sidenav.component.html',
    styleUrl: './sidenav.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        RouterLink,
        RouterLinkActive,
        ReactiveFormsModule,
        MatListModule,
        MatFormFieldModule,
        MatSelectModule,
        LazyOptionsDirective,
    ],
})
export class SidenavComponent {
    readonly #fb = inject(FormBuilder);
    readonly #todaysCalendarListState = inject(TodaysCalendarListState);
    readonly #routeStationListState = inject(RouteStationListState);
    readonly #agencyListState = inject(AgencyListState);

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

    readonly todaysCalendarId = this.#todaysCalendarListState.todaysCalendarId;
    readonly #routeStations = this.#routeStationListState.routeStations;
    readonly #agencies = this.#agencyListState.agencies;

    /** 駅 select の選択肢（「会社名 路線名」でまとめる。駅別時刻表・検索カードと共通）。 */
    readonly stationGroups = computed(() =>
        buildStationGroups(this.#routeStations(), this.#agencies()),
    );
    readonly selectedStationId = toSignal(this.stationId.valueChanges);

    /** 上り/下りリンクの行き先名。駅を選べば駅別時刻表、選ばなければ全線時刻表へ飛ぶ。 */
    readonly timetableLinkPrefix = computed(() => {
        if (!this.selectedStationId()) {
            return '全線時刻表';
        }
        return this.selectedStation()?.stationName ?? '駅別時刻表';
    });

    /** 選んでいる駅。選択肢を作る前（lazy-options）も select の表示に使う。 */
    readonly selectedStation = computed(() => {
        const selectedStationId = this.selectedStationId();
        if (!selectedStationId) return undefined;
        return this.stationGroups()
            .flatMap((group) => group.stations)
            .find((o) => o.stationId === selectedStationId);
    });

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
