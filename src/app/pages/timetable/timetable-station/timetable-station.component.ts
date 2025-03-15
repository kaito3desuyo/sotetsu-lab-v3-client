import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RxState } from '@rx-angular/state';
import { TitleService } from 'src/app/core/services/title.service';
import { TimetableSearchCardService } from 'src/app/shared/timetable-search-card/services/timetable-search-card.service';
import { TimetableStationHeaderCComponent } from './components/timetable-station-header-c/timetable-station-header-c.component';
import { TimetableStationMainCComponent } from './components/timetable-station-main-c/timetable-station-main-c.component';

@Component({
    selector: 'app-timetable-station',
    templateUrl: './timetable-station.component.html',
    styleUrls: ['./timetable-station.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TimetableStationHeaderCComponent, TimetableStationMainCComponent],
    providers: [RxState]
})
export class TimetableStationComponent {
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #state = inject<RxState<{}>>(RxState);
    readonly #titleService = inject(TitleService);
    readonly #timetableSearchCardService = inject(TimetableSearchCardService);

    constructor() {
        this.#state.hold(this.#route.data, ({ title }) => {
            this.#titleService.setTitle(title);
        });

        this.#state.hold(
            this.#timetableSearchCardService.receiveSearchTimetableEvent(),
            (state) => {
                if (state.searchByStation) {
                    this.#router.navigate([
                        'timetable',
                        'station',
                        {
                            calendar_id: state.calendarId,
                            station_id: state.stationId,
                            trip_direction: state.tripDirection,
                        },
                    ]);
                } else {
                    this.#router.navigate([
                        'timetable',
                        'all-line',
                        {
                            calendar_id: state.calendarId,
                            trip_direction: state.tripDirection,
                        },
                    ]);
                }
            },
        );
    }
}
