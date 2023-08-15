import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RxState } from '@rx-angular/state';
import { TitleService } from 'src/app/core/services/title.service';
import { OperationSearchCardService } from 'src/app/shared/operation-search-card/services/operation-search-card.service';
import { OperationPastTimeMainCComponent } from './components/operation-past-time-main-c/operation-past-time-main-c.component';
import { OperationPastTimeHeaderCComponent } from './components/operation-past-time-header-c/operation-past-time-header-c.component';

@Component({
    standalone: true,
    selector: 'app-operation-past-time',
    templateUrl: './operation-past-time.component.html',
    styleUrls: ['./operation-past-time.component.scss'],
    imports: [
        OperationPastTimeHeaderCComponent,
        OperationPastTimeMainCComponent,
    ],
    providers: [RxState],
})
export class OperationPastTimeComponent {
    constructor(
        private readonly route: ActivatedRoute,
        private readonly router: Router,
        private readonly state: RxState<{}>,
        private readonly titleService: TitleService,
        private readonly operationSearchCardService: OperationSearchCardService
    ) {
        this.state.hold(this.route.data, (data: { title: string }) => {
            this.titleService.setTitle(data.title);
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
    }
}
