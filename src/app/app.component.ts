import {
    ChangeDetectionStrategy,
    Component,
    inject,
    OnDestroy,
    OnInit,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { RxState } from '@rx-angular/state';
import { interval } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';
import { AppUpdateService } from './core/services/app-update.service';
import { GoogleAnalyticsService } from './core/services/google-analytics.service';
import { SocketService } from './core/services/socket.service';
import { TokenStateQuery, TokenStateStore } from './global-states/token.state';
import { LayoutComponent } from './layout/layout.component';
import { LoadingService } from './shared/app-shared/loading/loading.service';

@Component({
    standalone: true,
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    imports: [LayoutComponent],
    providers: [RxState],
})
export class AppComponent implements OnInit, OnDestroy {
    readonly #router = inject(Router);
    readonly #title = inject(Title);
    readonly #state = inject<RxState<{}>>(RxState);
    readonly #appUpdateService = inject(AppUpdateService);
    readonly #socketService = inject(SocketService);
    readonly #gaService = inject(GoogleAnalyticsService);
    readonly #loadingService = inject(LoadingService);
    readonly #tokenStateStore = inject(TokenStateStore);
    readonly #tokenStateQuery = inject(TokenStateQuery);

    constructor() {
        this.#state.hold(
            this.#router.events.pipe(
                filter<NavigationStart>((ev) => ev instanceof NavigationStart),
            ),
            () => {
                this.#loadingService.open();
            },
        );

        this.#state.hold(
            this.#router.events.pipe(
                filter<NavigationEnd>((ev) => ev instanceof NavigationEnd),
            ),
            (ev) => {
                this.#loadingService.close();
                this.#gaService.sendPageView(
                    this.#title.getTitle(),
                    ev.urlAfterRedirects,
                );
            },
        );

        this.#state.hold(
            interval(1000 * 10).pipe(
                map(() => this.#tokenStateQuery.isExpired),
                filter((bool) => !!bool),
                switchMap(() => this.#tokenStateStore.fetch()),
            ),
        );
    }

    ngOnInit(): void {
        this.#socketService.connect();
    }

    ngOnDestroy(): void {
        this.#socketService.disconnect();
    }
}
