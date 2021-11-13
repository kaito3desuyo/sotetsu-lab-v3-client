import { Component, Injector, Inject, OnInit } from '@angular/core';
import { TitleService } from 'src/app/general/services/title.service';
import { BaseComponent } from 'src/app/general/classes/base-component';
import { ActivatedRoute } from '@angular/router';
import { TimetableSearchFormService } from 'src/app/shared/timetable-shared/services/timetable-search-form.service';
import { ParamsQuery } from 'src/app/state/params';
import { SocketService } from 'src/app/general/services/socket.service';
import { CalendarService } from 'src/app/libs/calendar/usecase/calendar.service';
import { CondOperator, RequestQueryBuilder } from '@nestjsx/crud-request';
import {
    CalendarListStateQuery,
    CalendarListStateStore,
} from 'src/app/global-states/calendar-list.state';
import { Pagination } from 'src/app/core/utils/pagination';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent extends BaseComponent implements OnInit {
    constructor(
        @Inject(Injector) injector: Injector,
        private route: ActivatedRoute,
        private titleService: TitleService,
        private paramsQuery: ParamsQuery,
        private tiletableSearchFormService: TimetableSearchFormService,
        private socketService: SocketService,
        private readonly calendarService: CalendarService,
        private readonly calendarListStateStore: CalendarListStateStore,
        private readonly calendarListStateQuery: CalendarListStateQuery
    ) {
        super(injector);
        this.subscription = this.route.data.subscribe(
            (data: { title: string }) => {
                this.titleService.setTitle('');
            }
        );

        this.subscription = this.paramsQuery.calendar$.subscribe(
            (calendarId) => {
                this.tiletableSearchFormService.updateParams({
                    calendarId,
                });
            }
        );

        const qb = RequestQueryBuilder.create()
            .setFilter({
                field: 'startDate',
                operator: CondOperator.NOT_NULL,
            })
            .sortBy([
                { field: 'startDate', order: 'ASC' },
                { field: 'monday', order: 'DESC' },
            ]);

        this.calendarService
            .findMany(qb)
            .subscribe((data: Pagination<CalendarDetailsDto>) =>
                this.calendarListStateStore.set(data.items)
            );
    }

    async ngOnInit() {
        this.socketService.on().subscribe((e) => console.log(e));
    }
}
