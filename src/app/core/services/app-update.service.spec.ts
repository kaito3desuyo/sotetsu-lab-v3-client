import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { NavigationStart, Router } from '@angular/router';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { NGXLogger } from 'ngx-logger';
import { of, Subject } from 'rxjs';
import { ConfirmDialogService } from 'src/app/shared/confirm-dialog/services/confirm-dialog.service';
import {
    APP_LOCATION,
    AppUpdateService,
    UPDATE_ON_RETURN_AFTER_MS,
} from './app-update.service';

describe('AppUpdateService', () => {
    let versionUpdates: Subject<VersionEvent>;
    let unrecoverable: Subject<unknown>;
    let routerEvents: Subject<unknown>;
    let dialogResult: boolean | undefined;
    let swUpdate: { activateUpdate: jest.Mock };
    let confirmDialog: { open: jest.Mock };
    let location: { reload: jest.Mock; assign: jest.Mock };
    let document: Document;

    const versionReady = () =>
        versionUpdates.next({
            type: 'VERSION_READY',
            currentVersion: { hash: 'old' },
            latestVersion: { hash: 'new' },
        });

    const setHidden = (hidden: boolean) => {
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            get: () => (hidden ? 'hidden' : 'visible'),
        });
        document.dispatchEvent(new Event('visibilitychange'));
    };

    beforeEach(() => {
        versionUpdates = new Subject();
        unrecoverable = new Subject();
        routerEvents = new Subject();
        dialogResult = undefined;
        swUpdate = { activateUpdate: jest.fn(() => Promise.resolve(true)) };
        confirmDialog = {
            open: jest.fn(() => ({ afterClosed: () => of(dialogResult) })),
        };
        location = { reload: jest.fn(), assign: jest.fn() };

        TestBed.configureTestingModule({
            providers: [
                AppUpdateService,
                {
                    provide: SwUpdate,
                    useValue: {
                        isEnabled: false,
                        versionUpdates,
                        unrecoverable,
                        checkForUpdate: jest.fn(),
                        ...swUpdate,
                    },
                },
                {
                    provide: NGXLogger,
                    useValue: { log: jest.fn(), error: jest.fn() },
                },
                { provide: ConfirmDialogService, useValue: confirmDialog },
                { provide: Router, useValue: { events: routerEvents } },
                { provide: APP_LOCATION, useValue: location },
            ],
        });
        document = TestBed.inject(DOCUMENT);
        TestBed.inject(AppUpdateService);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('新しい版の準備ができたら、「今すぐ更新する」と「あとで」のダイアログを出す', () => {
        versionReady();

        expect(confirmDialog.open).toHaveBeenCalledTimes(1);
        const { data } = confirmDialog.open.mock.calls[0][0];
        expect(data.goButtonText).toBe('今すぐ更新する');
        expect(data.cancelButtonText).toBe('あとで');
        expect(data.html).toContain('次に画面を移るときに自動で更新します');
    });

    it('「今すぐ更新する」なら、更新を当ててその場で再読み込みする', async () => {
        dialogResult = true;
        versionReady();
        await Promise.resolve();

        expect(swUpdate.activateUpdate).toHaveBeenCalled();
        expect(location.reload).toHaveBeenCalled();
    });

    it('「あとで」なら、その場では再読み込みしない', async () => {
        dialogResult = false;
        versionReady();
        await Promise.resolve();

        expect(location.reload).not.toHaveBeenCalled();
        expect(location.assign).not.toHaveBeenCalled();
    });

    it('「あとで」のあと、次に画面を移るときに移り先を丸ごと読み込み直す', () => {
        dialogResult = false;
        versionReady();

        routerEvents.next(new NavigationStart(1, '/operation/real-time'));

        expect(location.assign).toHaveBeenCalledWith('/operation/real-time');
    });

    it('更新待ちでなければ、画面を移っても読み込み直さない', () => {
        routerEvents.next(new NavigationStart(1, '/operation/real-time'));

        expect(location.assign).not.toHaveBeenCalled();
    });

    it('「あとで」のあと、タブを裏にして 10 分以上たって戻ったら再読み込みする', () => {
        jest.useFakeTimers();
        dialogResult = false;
        versionReady();

        setHidden(true);
        jest.advanceTimersByTime(UPDATE_ON_RETURN_AFTER_MS);
        setHidden(false);

        expect(location.reload).toHaveBeenCalled();
    });

    it('裏にしていたのが 10 分未満なら、戻っても再読み込みしない', () => {
        jest.useFakeTimers();
        dialogResult = false;
        versionReady();

        setHidden(true);
        jest.advanceTimersByTime(UPDATE_ON_RETURN_AFTER_MS - 1000);
        setHidden(false);

        expect(location.reload).not.toHaveBeenCalled();
    });

    it('サービスワーカーが壊れた状態になったら、ダイアログなしで再読み込みする', () => {
        unrecoverable.next({ type: 'UNRECOVERABLE_STATE', reason: 'x' });

        expect(confirmDialog.open).not.toHaveBeenCalled();
        expect(location.reload).toHaveBeenCalled();
    });
});
