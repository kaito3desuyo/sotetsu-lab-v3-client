import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RxState } from '@rx-angular/state';
import { TitleService } from 'src/app/core/services/title.service';
import OPERATION_POST_CARD_PROVIDERS from 'src/app/shared/operation-post-card/operation-post-card.provider';
import OPERATION_SEARCH_CARD_PROVIDERS from 'src/app/shared/operation-search-card/operation-search-card.provider';
import { OperationSearchCardService } from 'src/app/shared/operation-search-card/services/operation-search-card.service';
import { TimetablePostCardService } from 'src/app/shared/timetable-post-card/services/timetable-post-card.service';
import TIMETABLE_POST_CARD_PROVIDERS from 'src/app/shared/timetable-post-card/timetable-post-card.provider';
import { TimetableSearchCardService } from 'src/app/shared/timetable-search-card/services/timetable-search-card.service';
import TIMETABLE_SEARCH_CARD_PROVIDERS from 'src/app/shared/timetable-search-card/timetable-search-card.provider';
import { DashboardMainCComponent } from './components/dashboard-main-c/dashboard-main-c.component';

@Component({
    standalone: true,
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    providers: [
        ...OPERATION_SEARCH_CARD_PROVIDERS,
        ...OPERATION_POST_CARD_PROVIDERS,
        ...TIMETABLE_SEARCH_CARD_PROVIDERS,
        ...TIMETABLE_POST_CARD_PROVIDERS,
        RxState,
    ],
    imports: [DashboardMainCComponent],
})
export class DashboardComponent {
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly state = inject(RxState);
    private readonly titleService = inject(TitleService);
    private readonly operationSearchCardService = inject(
        OperationSearchCardService
    );
    private readonly timetableSearchCardService = inject(
        TimetableSearchCardService
    );
    private readonly timetablePostCardService = inject(
        TimetablePostCardService
    );

    constructor() {
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
            this.operationSearchCardService.receiveSearchOperationRouteDiagramEvent(),
            (operationId) => {
                this.router.navigate([
                    '/operation/route-diagram',
                    { operation_id: operationId },
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
