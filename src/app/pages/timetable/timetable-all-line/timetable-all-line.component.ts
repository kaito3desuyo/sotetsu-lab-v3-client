import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RxState } from '@rx-angular/state';
import { TitleService } from 'src/app/core/services/title.service';
import { TimetableSearchCardService } from 'src/app/shared/timetable-search-card/services/timetable-search-card.service';
import { TimetableAllLineHeaderCComponent } from './components/timetable-all-line-header-c/timetable-all-line-header-c.component';
import { TimetableAllLineMainCComponent } from './components/timetable-all-line-main-c/timetable-all-line-main-c.component';

@Component({
    selector: 'app-timetable-all-line',
    templateUrl: './timetable-all-line.component.html',
    styleUrls: ['./timetable-all-line.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TimetableAllLineHeaderCComponent, TimetableAllLineMainCComponent],
    providers: [RxState]
})
export class TimetableAllLineComponent {
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
