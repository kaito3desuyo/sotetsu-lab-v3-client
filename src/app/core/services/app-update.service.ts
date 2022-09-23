import { Injectable } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { NGXLogger } from 'ngx-logger';
import { interval } from 'rxjs';
import { ConfirmDialogService } from 'src/app/shared/confirm-dialog/services/confirm-dialog.service';

@Injectable({
    providedIn: 'root',
})
export class AppUpdateService {
    constructor(
        private readonly updates: SwUpdate,
        private readonly logger: NGXLogger,
        private readonly confirmDialogService: ConfirmDialogService
    ) {
        this.logger.log(
            'AppUpdateService: Constructor',
            this.updates.isEnabled
        );

        if (this.updates.isEnabled) {
            interval(1000 * 60).subscribe(() => {
                this.logger.log('AppUpdateService: Checking for updates');
                this.updates.checkForUpdate();
            });
        }

        updates.versionUpdates.subscribe((ev) => {
            switch (ev.type) {
                case 'VERSION_DETECTED':
                    this.logger.log(
                        `Downloading new app version: ${ev.version.hash}`
                    );
                    break;
                case 'VERSION_READY':
                    this.logger.log(
                        `Current app version: ${ev.currentVersion.hash}`
                    );
                    this.logger.log(
                        `New app version ready for use: ${ev.latestVersion.hash}`
                    );

                    const dialogRef = this.confirmDialogService.open({
                        data: {
                            title: '新しいバージョン',
                            html: '<p>アプリに新しいバージョンがあります。今すぐ更新しますか？</p>',
                            goButtonText: '更新する',
                            goButtonColor: 'primary',
                            cancelButtonText: 'キャンセル',
                        },
                    });

                    dialogRef.afterClosed().subscribe(async (bool) => {
                        if (bool) {
                            await updates.activateUpdate();
                            location.reload();
                        }
                    });
                    break;
                case 'VERSION_INSTALLATION_FAILED':
                    this.logger.error(
                        `Failed to install app version '${ev.version.hash}': ${ev.error}`
                    );
                    break;
            }
        });
    }
}
