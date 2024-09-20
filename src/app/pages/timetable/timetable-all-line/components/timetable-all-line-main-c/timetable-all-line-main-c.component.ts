import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { AdsenseModule } from 'ng2-adsense';
import { TimetableSearchCardCComponent } from 'src/app/shared/timetable-search-card/components/timetable-search-card-c/timetable-search-card-c.component';
import { TimetableSearchCardStateStore } from 'src/app/shared/timetable-search-card/states/timetable-search-card.state';
import { TimetableAllLineStateQuery } from '../../states/timetable-all-line.state';
import { TimetableAllLineTableCComponent } from '../timetable-all-line-table-c/timetable-all-line-table-c.component';

@Component({
    standalone: true,
    selector: 'app-timetable-all-line-main-c',
    templateUrl: './timetable-all-line-main-c.component.html',
    styleUrls: ['./timetable-all-line-main-c.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AdsenseModule,
        TimetableAllLineTableCComponent,
        TimetableSearchCardCComponent,
    ],
    providers: [RxState],
})
export class TimetableAllLineMainCComponent {
    readonly #state = inject<RxState<{}>>(RxState);
    readonly #timetableAllLineStateQuery = inject(TimetableAllLineStateQuery);
    readonly #timetableSearchCardStateStore = inject(
        TimetableSearchCardStateStore,
    );

    constructor() {
        this.#state.hold(
            this.#timetableAllLineStateQuery.calendarId$,
            (calendarId) => {
                this.#timetableSearchCardStateStore.setCalendarId(calendarId);
            },
        );

        this.#state.hold(
            this.#timetableAllLineStateQuery.tripDirection$,
            (tripDirection) => {
                this.#timetableSearchCardStateStore.setTripDirection(
                    tripDirection,
                );
            },
        );
    }
}
