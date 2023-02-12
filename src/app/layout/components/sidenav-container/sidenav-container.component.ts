import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { RxState } from '@rx-angular/state';
import { filter } from 'rxjs/operators';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { SidenavService } from '../../services/sidenav.service';

@Component({
    selector: 'app-sidenav-container',
    templateUrl: './sidenav-container.component.html',
    styleUrls: ['./sidenav-container.component.scss'],
    providers: [RxState],
})
export class SidenavContainerComponent {
    readonly sidenavState$ = this.sidenavService.getState();
    readonly todaysCalendarId$ =
        this.todaysCalendarListStateQuery.todaysCalendarId$;
    readonly routeStations$ = this.routeStationListStateQuery.routeStations$;

    constructor(
        private readonly router: Router,
        private readonly state: RxState<{}>,
        private readonly sidenavService: SidenavService,
        private readonly todaysCalendarListStateQuery: TodaysCalendarListStateQuery,
        private readonly routeStationListStateQuery: RouteStationListStateQuery
    ) {
        this.state.hold(
            this.router.events.pipe(
                filter((ev) => ev instanceof NavigationEnd)
            ),
            () => {
                this.sidenavService.setState(false);
            }
        );
    }
}
