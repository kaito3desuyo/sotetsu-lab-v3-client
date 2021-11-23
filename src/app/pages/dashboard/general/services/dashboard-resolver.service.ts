import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TitleService } from 'src/app/general/services/title.service';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { TimetableSearchCardStateStore } from 'src/app/shared/timetable-search-card/states/timetable-search-card.state';
import { DashboardService } from './dashboard.service';

@Injectable()
export class DashboardResolverService implements Resolve<Observable<void>> {
    constructor(
        private readonly titleService: TitleService,
        private readonly dashboardService: DashboardService,
        private readonly todaysCalendarListStateQuery: TodaysCalendarListStateQuery,
        private readonly timetableSearchCardStateStore: TimetableSearchCardStateStore
    ) {}

    resolve(): Observable<void> {
        this.timetableSearchCardStateStore.updateCurrentState({
            calendarId: this.todaysCalendarListStateQuery.todaysCalendarId,
        });

        return forkJoin([this.dashboardService.fetchCalendars()]).pipe(
            map(() => null)
        );
    }
}
