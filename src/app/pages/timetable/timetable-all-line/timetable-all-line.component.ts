import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RxState } from '@rx-angular/state';
import { TitleService } from 'src/app/general/services/title.service';
import { TimetableSearchCardService } from 'src/app/shared/timetable-search-card/services/timetable-search-card.service';

@Component({
    selector: 'app-timetable-all-line',
    templateUrl: './timetable-all-line.component.html',
    styleUrls: ['./timetable-all-line.component.scss'],
    providers: [RxState],
})
export class TimetableAllLineComponent {
    constructor(
        private readonly route: ActivatedRoute,
        private readonly router: Router,
        private readonly state: RxState<{}>,
        private readonly titleService: TitleService,
        private readonly timetableSearchCardService: TimetableSearchCardService
    ) {
        this.state.hold(this.route.data, ({ title }) => {
            this.titleService.setTitle(title);
        });

        this.state.hold(
            this.timetableSearchCardService.receiveSearchTimetableEvent(),
            (state) => {
                if (state.searchByStation) {
                    this.router.navigate([
                        'timetable',
                        'station',
                        {
                            calendar_id: state.calendarId,
                            station_id: state.stationId,
                            trip_direction: state.tripDirection,
                        },
                    ]);
                } else {
                    this.router.navigate([
                        'timetable',
                        'all-line',
                        {
                            calendar_id: state.calendarId,
                            trip_direction: state.tripDirection,
                        },
                    ]);
                }
            }
        );
    }
}
