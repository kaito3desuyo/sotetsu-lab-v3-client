import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RxState } from '@rx-angular/state';
import { TitleService } from 'src/app/core/services/title.service';
import { OperationSearchCardService } from 'src/app/shared/operation-search-card/services/operation-search-card.service';
import { OperationRouteDiagramService } from './services/operation-route-diagram.service';
import { OperationRouteDiagramStateQuery } from './states/operation-route-diagram.state';

@Component({
    selector: 'app-operation-route-diagram',
    templateUrl: './operation-route-diagram.component.html',
    styleUrls: ['./operation-route-diagram.component.scss'],
    providers: [RxState],
})
export class OperationRouteDiagramComponent {
    constructor(
        private readonly route: ActivatedRoute,
        private readonly router: Router,
        private readonly state: RxState<{}>,
        private readonly titleService: TitleService,
        private readonly operationSearchCardService: OperationSearchCardService,
        private readonly operationRouteDiagramService: OperationRouteDiagramService,
        private readonly operationRouteDiagramStateQuery: OperationRouteDiagramStateQuery
    ) {
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
            this.operationRouteDiagramService.receiveNavigateTimetableEvent(),
            (ev) => {
                this.router.navigate([
                    '/timetable',
                    'all-line',
                    {
                        calendar_id:
                            this.operationRouteDiagramStateQuery.calendarId,
                        trip_block_id: ev.tripBlockId,
                        trip_direction: ev.tripDirection,
                    },
                ]);
            }
        );
    }
}
