import { Component, OnDestroy, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { RxState } from '@rx-angular/state';
import { filter } from 'rxjs/operators';
import { AppUpdateService } from './core/services/app-update.service';
import { SocketService } from './core/services/socket.service';
import { GoogleAnalyticsService } from './core/services/google-analytics.service';
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
        private readonly loadingService: LoadingService
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
    }

    ngOnInit(): void {
        this.socketService.connect();
    }

    ngOnDestroy(): void {
        this.socketService.disconnect();
    }
}
