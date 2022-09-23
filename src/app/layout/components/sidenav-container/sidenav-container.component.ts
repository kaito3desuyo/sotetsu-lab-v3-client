import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { RxState } from '@rx-angular/state';
import { filter, map } from 'rxjs/operators';
import { RoutesAllStationsQuery } from 'src/app/general/models/routes/state/routes-all-stations.query';
import { RoutesAllStationsService } from 'src/app/general/models/routes/state/routes-all-stations.service';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { SidenavService } from '../../services/sidenav.service';

@Component({
    selector: 'app-sidenav-container',
    templateUrl: './sidenav-container.component.html',
    styleUrls: ['./sidenav-container.component.scss'],
    providers: [RxState],
})
export class SidenavContainerComponent {
    readonly todaysCalendarId$ =
        this.todaysCalendarListStateQuery.todaysCalendarId$;
    readonly stationsSelectList$ = this.routesAllStationsQuery
        .selectAll()
        .pipe(
            map((routes) =>
                this.routesAllStationsService.generateStationSelectList(routes)
            )
        );
    readonly sidenavState$ = this.sidenavService.getState();

    constructor(
        private readonly router: Router,
        private readonly state: RxState<{}>,
        private readonly sidenavService: SidenavService,
        private readonly todaysCalendarListStateQuery: TodaysCalendarListStateQuery,
        private readonly routesAllStationsQuery: RoutesAllStationsQuery,
        private readonly routesAllStationsService: RoutesAllStationsService
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
