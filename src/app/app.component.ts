import { Component, OnDestroy, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { RxState } from '@rx-angular/state';
import { interval } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';
import { AppUpdateService } from './core/services/app-update.service';
import { GoogleAnalyticsService } from './core/services/google-analytics.service';
import { SocketService } from './core/services/socket.service';
import { TokenStateQuery, TokenStateStore } from './global-states/token.state';
import { LoadingService } from './shared/app-shared/loading/loading.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    providers: [RxState],
})
export class AppComponent implements OnInit, OnDestroy {
    constructor(
        private readonly router: Router,
        private readonly title: Title,
        private readonly state: RxState<{}>,
        private readonly appUpdateService: AppUpdateService,
        private readonly socketService: SocketService,
        private readonly gaService: GoogleAnalyticsService,
        private readonly loadingService: LoadingService,
        private readonly tokenStateStore: TokenStateStore,
        private readonly tokenStateQuery: TokenStateQuery
    ) {
        this.state.hold(
            this.router.events.pipe(
                filter<NavigationStart>((ev) => ev instanceof NavigationStart)
            ),
            () => {
                this.loadingService.open();
            }
        );

        this.state.hold(
            this.router.events.pipe(
                filter<NavigationEnd>((ev) => ev instanceof NavigationEnd)
            ),
            (ev) => {
                this.loadingService.close();
                this.gaService.sendPageView(
                    this.title.getTitle(),
                    ev.urlAfterRedirects
                );
            }
        );

        this.state.hold(
            interval(1000 * 10).pipe(
                map(() => this.tokenStateQuery.isExpired),
                filter((bool) => !!bool),
                switchMap(() => this.tokenStateStore.fetch())
            )
        );
    }

    ngOnInit(): void {
        this.socketService.connect();
    }

    ngOnDestroy(): void {
        this.socketService.disconnect();
    }
}
