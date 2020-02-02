import { Component, Injector, Inject, OnInit } from '@angular/core';
import { TitleService } from 'src/app/general/services/title.service';
import { BaseComponent } from 'src/app/general/classes/base-component';
import { ActivatedRoute } from '@angular/router';
import { TimetableSearchFormService } from 'src/app/shared/timetable-shared/services/timetable-search-form.service';
import { ParamsQuery } from 'src/app/state/params';
import { SocketService } from 'src/app/general/services/socket.service';

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent extends BaseComponent implements OnInit {
    constructor(
        @Inject(Injector) injector: Injector,
        private route: ActivatedRoute,
        private titleService: TitleService,
        private paramsQuery: ParamsQuery,
        private tiletableSearchFormService: TimetableSearchFormService,
        private socketService: SocketService
    ) {
        super(injector);
        this.subscription = this.route.data.subscribe(
            (data: { title: string }) => {
                this.titleService.setTitle('');
            }
        );

        this.subscription = this.paramsQuery.calendar$.subscribe(calendarId => {
            this.tiletableSearchFormService.updateParams({
                calendarId
            });
        });
    }

    async ngOnInit() {
        this.socketService.on().subscribe(e => console.log(e));
    }
}
