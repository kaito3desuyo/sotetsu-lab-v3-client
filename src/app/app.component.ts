import {
    Component,
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
import { combineLatest } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { toErrorMessage } from './core/errors/to-error-message';
import { QueryInvalidator } from './core/query-cache/query-invalidator';
import { AppUpdateService } from './core/services/app-update.service';
import { GoogleAnalyticsService } from './core/services/google-analytics.service';
import { NotificationService } from './core/services/notification.service';
import {
    readSocketSignal,
    SocketSignalType,
} from './core/services/socket-signal';
import { SocketService } from './core/services/socket.service';
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
    readonly #router = inject(Router);
    readonly #title = inject(Title);
    readonly #appUpdateService = inject(AppUpdateService);
    readonly #socketService = inject(SocketService);
    readonly #queryInvalidator = inject(QueryInvalidator);
    readonly #gaService = inject(GoogleAnalyticsService);
    readonly #loadingService = inject(LoadingService);
    readonly #notificationService = inject(NotificationService);
    readonly #userStateQuery = inject(UserStateQuery);

    constructor() {
        // api が保存に成功したら、socket が {"type": …} を送ってくる。その種類の画面内キャッシュを捨てる
        // （古い sendSighting の転送 {action, data} は読み捨てる）
        this.#socketService
            .on()
            .pipe(
                map(readSocketSignal),
                filter((type): type is SocketSignalType => type !== null),
                takeUntilDestroyed(),
            )
            .subscribe((type) => this.#queryInvalidator.invalidateLocal(type));

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
                    error_message: toErrorMessage(ev.error),
                });
                this.#notificationService.open(
                    'ページの読み込みに失敗しました',
                    'OK',
                );
            });
    }

    ngOnInit(): void {
        this.#socketService.connect();
    }

    ngOnDestroy(): void {
        this.#socketService.disconnect();
    }
}
