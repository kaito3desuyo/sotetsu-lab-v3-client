import { Component, Inject, Injector } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RxState } from '@rx-angular/state';
import { BaseComponent } from 'src/app/general/classes/base-component';
import { TitleService } from 'src/app/general/services/title.service';
import { OperationSearchCardService } from 'src/app/shared/operation-search-card/services/operation-search-card.service';
import { TimetablePostCardService } from 'src/app/shared/timetable-post-card/services/timetable-post-card.service';
import { TimetableSearchCardService } from 'src/app/shared/timetable-search-card/services/timetable-search-card.service';

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    providers: [RxState],
})
export class DashboardComponent extends BaseComponent {
    constructor(
        @Inject(Injector) injector: Injector,
        private readonly router: Router,
        private readonly state: RxState<{}>,
        private route: ActivatedRoute,
        private titleService: TitleService,
        private readonly operationSearchCardService: OperationSearchCardService,
        private readonly timetableSearchCardService: TimetableSearchCardService,
        private readonly timetablePostCardService: TimetablePostCardService
    ) {
        super(injector);

        this.state.hold(this.route.data, ({ title }) => {
            this.titleService.setTitle(title);
        });

        this.state.hold(
            this.operationSearchCardService.receiveSearchOperationTableEvent(),
            (calendarId) => {
                this.router.navigate([
                    '/operation/table',
                    { calendar_id: calendarId },
                ]);
            }
        );

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

        this.state.hold(
            this.timetablePostCardService.receiveMoveTimetableAddEvent(),
            (state) => {
                this.router.navigate([
                    'timetable',
                    'add',
                    state.calendarId,
                    { trip_direction: state.tripDirection },
                ]);
            }
        );
    }
}
