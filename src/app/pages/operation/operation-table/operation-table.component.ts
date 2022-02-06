import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RxState } from '@rx-angular/state';
import { TitleService } from 'src/app/general/services/title.service';
import { OperationSearchCardService } from 'src/app/shared/operation-search-card/services/operation-search-card.service';

@Component({
    selector: 'app-operation-table',
    templateUrl: './operation-table.component.html',
    styleUrls: ['./operation-table.component.scss'],
    providers: [RxState],
})
export class OperationTableComponent {
    constructor(
        private readonly router: Router,
        private readonly route: ActivatedRoute,
        private readonly titleService: TitleService,
        private readonly state: RxState<{}>,
        private readonly operationSearchCardService: OperationSearchCardService
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
    }
}
