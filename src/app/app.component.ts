import {
    ApplicationRef,
    Component,
    DestroyRef,
    inject,
    OnDestroy,
    OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { interval } from 'rxjs';
import { filter, first, map, switchMap } from 'rxjs/operators';
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
})
export class AppComponent implements OnInit, OnDestroy {
    readonly #appRef = inject(ApplicationRef);
    readonly #destroyRef = inject(DestroyRef);
    readonly #router = inject(Router);
    readonly #title = inject(Title);
    readonly #appUpdateService = inject(AppUpdateService);
    readonly #socketService = inject(SocketService);
    readonly #gaService = inject(GoogleAnalyticsService);
    readonly #loadingService = inject(LoadingService);
    readonly #tokenStateStore = inject(TokenStateStore);
    readonly #tokenStateQuery = inject(TokenStateQuery);

    constructor() {
        this.#router.events
            .pipe(
                filter<NavigationStart>((ev) => ev instanceof NavigationStart),
                takeUntilDestroyed(),
            )
            .subscribe(() => {
                this.#loadingService.open();
            });

        this.#router.events
            .pipe(filter<NavigationEnd>((ev) => ev instanceof NavigationEnd))
            .subscribe((ev) => {
                this.#loadingService.close();
                this.#gaService.sendPageView(
                    this.#title.getTitle(),
                    ev.urlAfterRedirects,
                );
            });

        this.#appRef.isStable.pipe(first((bool) => !!bool)).subscribe(() => {
            interval(1000 * 10)
                .pipe(
                    map(() => this.#tokenStateQuery.isExpired),
                    filter((bool) => !!bool),
                    switchMap(() => this.#tokenStateStore.fetch()),
                    takeUntilDestroyed(this.#destroyRef),
                )
                .subscribe();
        });
    }

    ngOnInit(): void {
        this.#socketService.connect();
    }

    ngOnDestroy(): void {
        this.#socketService.disconnect();
    }
}
