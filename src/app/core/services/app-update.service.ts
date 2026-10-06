import { DOCUMENT } from '@angular/common';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { NGXLogger } from 'ngx-logger';
import { filter, interval } from 'rxjs';
import { ConfirmDialogService } from 'src/app/shared/confirm-dialog/services/confirm-dialog.service';

/** 再読み込みに使う location（テストで差し替える） */
export const APP_LOCATION = new InjectionToken<
    Pick<Location, 'reload' | 'assign'>
>('APP_LOCATION', {
    providedIn: 'root',
    factory: () => inject(DOCUMENT).location,
});

/** 更新待ちで、タブを裏にしてからこの時間がたって戻ったら再読み込みする */
export const UPDATE_ON_RETURN_AFTER_MS = 10 * 60 * 1000;

/**
 * 新しい版の更新。ダイアログで「あとで」を選んでも、次に画面を移るとき（または
 * 裏から 10 分以上たって戻ったとき）に必ず更新する（2026-10-07）。以前はキャンセルすると
 * 古い版のまま使い続けられ、1 本ずつ取る古い通信が API に残っていた。
 *
 * 「あとで」の側では activateUpdate しない。今のタブのまま新しい版に切り替えると、
 * まだ読み込んでいない古い版の部品を取りに行って失敗するため。ページを丸ごと
 * 読み込み直せば、サービスワーカーは新しい版を出す。
 */
@Injectable({
    providedIn: 'root',
})
export class AppUpdateService {
    readonly #updates = inject(SwUpdate);
    readonly #logger = inject(NGXLogger);
    readonly #confirmDialogService = inject(ConfirmDialogService);
    readonly #router = inject(Router);
    readonly #document = inject(DOCUMENT);
    readonly #location = inject(APP_LOCATION);

    #updatePending = false;
    #hiddenAt: number | null = null;

    constructor() {
        this.#logger.log(
            'AppUpdateService: Constructor',
            this.#updates.isEnabled,
        );

        if (this.#updates.isEnabled) {
            interval(1000 * 60).subscribe(() => {
                this.#logger.log('AppUpdateService: Checking for updates');
                this.#updates.checkForUpdate();
            });
        }

        this.#updates.versionUpdates.subscribe((ev) => {
            switch (ev.type) {
                case 'VERSION_DETECTED':
                    this.#logger.log(
                        `Downloading new app version: ${ev.version.hash}`,
                    );
                    break;
                case 'VERSION_READY':
                    this.#logger.log(
                        `Current app version: ${ev.currentVersion.hash}`,
                    );
                    this.#logger.log(
                        `New app version ready for use: ${ev.latestVersion.hash}`,
                    );
                    this.#confirmUpdate();
                    break;
                case 'VERSION_INSTALLATION_FAILED':
                    this.#logger.error(
                        `Failed to install app version '${ev.version.hash}': ${ev.error}`,
                    );
                    break;
            }
        });

        // 壊れた状態のままでは動かないので、聞かずに読み込み直す
        this.#updates.unrecoverable.subscribe((ev) => {
            this.#logger.error(`Unrecoverable app state: ${ev.reason}`);
            this.#location.reload();
        });

        this.#router.events
            .pipe(
                filter(
                    (ev): ev is NavigationStart =>
                        ev instanceof NavigationStart,
                ),
                filter(() => this.#updatePending),
            )
            .subscribe((ev) => {
                this.#location.assign(ev.url);
            });

        this.#document.addEventListener('visibilitychange', () => {
            if (this.#document.visibilityState === 'hidden') {
                this.#hiddenAt = Date.now();
                return;
            }

            const hiddenAt = this.#hiddenAt;
            this.#hiddenAt = null;
            if (
                this.#updatePending &&
                hiddenAt !== null &&
                Date.now() - hiddenAt >= UPDATE_ON_RETURN_AFTER_MS
            ) {
                this.#location.reload();
            }
        });
    }

    #confirmUpdate(): void {
        const dialogRef = this.#confirmDialogService.open({
            data: {
                title: '新しいバージョン',
                html: '<p>アプリに新しいバージョンがあります。次に画面を移るときに自動で更新します。</p>',
                goButtonText: '今すぐ更新する',
                goButtonColor: 'primary',
                cancelButtonText: 'あとで',
            },
        });

        dialogRef.afterClosed().subscribe(async (bool) => {
            if (bool) {
                await this.#updates.activateUpdate();
                this.#location.reload();
                return;
            }
            this.#updatePending = true;
        });
    }
}
