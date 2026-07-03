import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RxState } from '@rx-angular/state';
import { NotificationService } from 'src/app/core/services/notification.service';
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
    readonly #notificationService = inject(NotificationService);

    constructor() {
        this.#state.hold(this.#route.data, ({ title }) => {
            this.#titleService.setTitle(title);
        });

        this.#state.hold(
            this.#timetableSearchCardService.receiveSearchTimetableEvent(),
            (state) => {
                const navigation = state.searchByStation
                    ? this.#router.navigate([
                          'timetable',
                          'station',
                          {
                              calendar_id: state.calendarId,
                              station_id: state.stationId,
                              trip_direction: state.tripDirection,
                          },
                      ])
                    : this.#router.navigate([
                          'timetable',
                          'all-line',
                          {
                              calendar_id: state.calendarId,
                              trip_direction: state.tripDirection,
                          },
                      ]);

                navigation
                    .then((succeeded) => {
                        if (!succeeded) {
                            console.error(
                                'timetable navigation did not complete',
                            );
                            this.#notificationService.open(
                                'ページの遷移に失敗しました',
                                'OK',
                            );
                        }
                    })
                    .catch((error) => {
                        console.error('timetable navigation failed', error);
                        this.#notificationService.open(
                            'ページの遷移に失敗しました',
                            'OK',
                        );
                    });
            },
        );
    }
}
