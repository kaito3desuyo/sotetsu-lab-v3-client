import {
    ApplicationRef,
    Component,
    DestroyRef,
    inject,
    OnDestroy,
    OnInit,
    ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import {
    NavigationCancel,
    NavigationEnd,
    NavigationError,
    NavigationStart,
    Router,
} from '@angular/router';
import { interval } from 'rxjs';
import { filter, first, map, switchMap } from 'rxjs/operators';
import { QueryInvalidator } from './core/query-cache/query-invalidator';
import { AppUpdateService } from './core/services/app-update.service';
import { GoogleAnalyticsService } from './core/services/google-analytics.service';
import { NotificationService } from './core/services/notification.service';
import { SocketService } from './core/services/socket.service';
import { TokenStateQuery, TokenStateStore } from './global-states/token.state';
import { LayoutComponent } from './layout/layout.component';
import { LoadingService } from './shared/app-shared/loading/loading.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [LayoutComponent],
})
export class AppComponent implements OnInit, OnDestroy {
    readonly #appRef = inject(ApplicationRef);
    readonly #destroyRef = inject(DestroyRef);
    readonly #router = inject(Router);
    readonly #title = inject(Title);
    readonly #appUpdateService = inject(AppUpdateService);
    readonly #socketService = inject(SocketService);
    readonly #queryInvalidator = inject(QueryInvalidator);
    readonly #gaService = inject(GoogleAnalyticsService);
    readonly #loadingService = inject(LoadingService);
    readonly #notificationService = inject(NotificationService);
    readonly #tokenStateStore = inject(TokenStateStore);
    readonly #tokenStateQuery = inject(TokenStateQuery);

    constructor() {
        // 他人が目撃を投稿したら、どの画面でも目撃の画面内キャッシュを捨てる
        // （ソケットに流れるのは sendSighting の転送だけ）
        this.#socketService
            .on()
            .pipe(takeUntilDestroyed())
            .subscribe(() =>
                this.#queryInvalidator.invalidateLocal('sighting'),
            );

        this.#router.events
            .pipe(
                filter<NavigationStart>((ev) => ev instanceof NavigationStart),
                takeUntilDestroyed(),
            )
            .subscribe(() => {
                this.#loadingService.open();
            });

        this.#router.events
            .pipe(
                filter<NavigationEnd>((ev) => ev instanceof NavigationEnd),
                takeUntilDestroyed(),
            )
            .subscribe((ev) => {
                this.#loadingService.close();
                this.#gaService.sendPageView(
                    this.#title.getTitle(),
                    ev.urlAfterRedirects,
                );
            });

        this.#router.events
            .pipe(
                filter<NavigationCancel>(
                    (ev) => ev instanceof NavigationCancel,
                ),
                takeUntilDestroyed(),
            )
            .subscribe(() => {
                this.#loadingService.close();
            });

        this.#router.events
            .pipe(
                filter<NavigationError>((ev) => ev instanceof NavigationError),
                takeUntilDestroyed(),
            )
            .subscribe(() => {
                this.#loadingService.close();
                this.#notificationService.open(
                    'ページの読み込みに失敗しました',
                    'OK',
                );
            });

        // this.#appRef.isStable.pipe(first((bool) => !!bool)).subscribe(() => {
        interval(1000 * 10)
            .pipe(
                map(() => this.#tokenStateQuery.isExpired),
                filter((bool) => !!bool),
                switchMap(() => this.#tokenStateStore.fetch()),
                takeUntilDestroyed(this.#destroyRef),
            )
            .subscribe();
        // });
    }

    ngOnInit(): void {
        this.#socketService.connect();
    }

    ngOnDestroy(): void {
        this.#socketService.disconnect();
    }
}
