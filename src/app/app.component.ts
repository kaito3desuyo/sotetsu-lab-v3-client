import { Component, Inject, Injector, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { BaseComponent } from './general/classes/base-component';
import { AppUpdateService } from './general/services/app-update.service';
import { GoogleAnalyticsService } from './general/services/google-analytics.service';
import { SocketService } from './general/services/socket.service';
import { LoadingService } from './shared/app-shared/loading/loading.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent extends BaseComponent implements OnInit, OnDestroy {
    constructor(
        @Inject(Injector) injector: Injector,
        private router: Router,
        private gaService: GoogleAnalyticsService,
        private appUpdateService: AppUpdateService,
        private loadingService: LoadingService,
        private socketService: SocketService
    ) {
        super(injector);

        this.subscription = this.router.events.subscribe((event) => {
            if (event instanceof NavigationStart) {
                this.loadingService.open();
            }
            if (event instanceof NavigationEnd) {
                this.loadingService.close();
                this.gaService.sendPageView(event.urlAfterRedirects);
            }
        });
    }

    ngOnInit(): void {
        this.socketService.connect();
    }

    ngOnDestroy(): void {
        this.socketService.disconnect();
    }
}
