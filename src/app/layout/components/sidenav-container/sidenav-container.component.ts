import { Component, OnInit, Inject, Injector } from '@angular/core';
import { SidenavService } from '../../services/sidenav.service';
import { RoutesAllStationsQuery } from 'src/app/general/models/routes/state/routes-all-stations.query';
import { RoutesAllStationsService } from 'src/app/general/models/routes/state/routes-all-stations.service';
import { map } from 'rxjs/operators';
import { Router, NavigationEnd, NavigationStart } from '@angular/router';
import { BaseComponent } from 'src/app/general/classes/base-component';
import { Observable } from 'rxjs';
import { ParamsQuery } from 'src/app/state/params';

@Component({
    selector: 'app-sidenav-container',
    templateUrl: './sidenav-container.component.html',
    styleUrls: ['./sidenav-container.component.scss'],
})
export class SidenavContainerComponent extends BaseComponent {
    todaysCalendarId$: Observable<string>;
    stationsSelectList$ = this.routesAllStationsQuery
        .selectAll()
        .pipe(
            map((routes) =>
                this.routesAllStationsService.generateStationSelectList(routes)
            )
        );
    sidenavState$ = this.sidenavService.getState();

    constructor(
        @Inject(Injector) injector: Injector,
        private router: Router,
        private sidenavService: SidenavService,
        private paramsQuery: ParamsQuery,
        private routesAllStationsQuery: RoutesAllStationsQuery,
        private routesAllStationsService: RoutesAllStationsService
    ) {
        super(injector);
        this.todaysCalendarId$ = this.paramsQuery.select('calendarId');
        this.subscription = this.router.events.subscribe((events) => {
            if (events instanceof NavigationEnd) {
                this.sidenavService.setState(false);
            }
        });
    }
}
