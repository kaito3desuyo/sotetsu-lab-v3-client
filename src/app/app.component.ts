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
import { combineLatest, EMPTY, interval } from 'rxjs';
import { catchError, filter, first, map, switchMap } from 'rxjs/operators';
import { QueryInvalidator } from './core/query-cache/query-invalidator';
import { AppUpdateService } from './core/services/app-update.service';
import { GoogleAnalyticsService } from './core/services/google-analytics.service';
import { NotificationService } from './core/services/notification.service';
import { SocketService } from './core/services/socket.service';
import { TokenStateQuery, TokenStateStore } from './global-states/token.state';
import { UserStateQuery } from './global-states/user.state';
import { LayoutComponent } from './layout/layout.component';
import { LoadingService } from './shared/loading/loading.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
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
    readonly #userStateQuery = inject(UserStateQuery);

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

        // 編集する人と見るだけの人を分けて集計できるよう、ログインの状態を GA に載せる
        combineLatest([
            this.#userStateQuery.isLoggedIn$,
            this.#userStateQuery.role$,
        ])
            .pipe(takeUntilDestroyed())
            .subscribe(([loggedIn, role]) => {
                this.#gaService.setUserProperties({ loggedIn, role });
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
            .subscribe((ev) => {
                this.#loadingService.close();
                this.#gaService.sendEvent('page_load_error', {
                    // GA のイベントの値は 100 文字まで
                    error_message: (ev.error instanceof Error
                        ? `${ev.error.name}: ${ev.error.message}`
                        : String(ev.error)
                    ).slice(0, 100),
                });
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
                // 1 回の失敗で流れごと止まらないよう、その回だけ捨てて次の 10 秒で取り直す
                switchMap(() =>
                    this.#tokenStateStore.fetch().pipe(catchError(() => EMPTY)),
                ),
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
