import { Component, Inject, Injector, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RxState } from '@rx-angular/state';
import { BaseComponent } from 'src/app/general/classes/base-component';
import { TitleService } from 'src/app/general/services/title.service';
import { OperationSearchCardService } from 'src/app/shared/operation-search-card/services/operation-search-card.service';
import { TimetableSearchFormService } from 'src/app/shared/timetable-shared/services/timetable-search-form.service';
import { ParamsQuery } from 'src/app/state/params';

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
        private paramsQuery: ParamsQuery,
        private tiletableSearchFormService: TimetableSearchFormService,
        private readonly operationSearchCardService: OperationSearchCardService
    ) {
        super(injector);

        this.state.hold(this.route.data, ({ title }) => {
            this.titleService.setTitle(title);
        });

        this.subscription = this.paramsQuery.calendar$.subscribe(
            (calendarId) => {
                this.tiletableSearchFormService.updateParams({
                    calendarId,
                });
            }
        );

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
