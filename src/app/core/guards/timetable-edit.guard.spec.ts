import { TestBed } from '@angular/core/testing';
import {
    ActivatedRouteSnapshot,
    provideRouter,
    Router,
    RouterStateSnapshot,
    UrlTree,
} from '@angular/router';
import { of, throwError } from 'rxjs';
import { NotificationService } from 'src/app/core/services/notification.service';
import { TokenStateStore } from 'src/app/global-states/token.state';
import {
    UserStateQuery,
    UserStateStore,
} from 'src/app/global-states/user.state';
import { UserService } from 'src/app/libs/user/usecase/user.service';
import { timetableEditGuard } from './timetable-edit.guard';

const URL = '/timetable/update;calendar_id=c1;trip_block_id=b1';

describe('timetableEditGuard', () => {
    let notificationOpen: jest.Mock;
    let tokenFetch: jest.Mock;
    let router: Router;

    /** role が null ならゲスト（profile が null）。profileError なら profile の取得が失敗する */
    function run(
        role: string | null,
        profileError = false,
    ): Promise<boolean | UrlTree> {
        notificationOpen = jest.fn();
        tokenFetch = jest.fn(() => of(undefined));
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                {
                    provide: NotificationService,
                    useValue: { open: notificationOpen },
                },
                { provide: TokenStateStore, useValue: { fetch: tokenFetch } },
                {
                    provide: UserService,
                    useValue: {
                        getProfile: () =>
                            profileError
                                ? throwError(() => new Error('offline'))
                                : of(
                                      role
                                          ? {
                                                userId: 'u1',
                                                username: 'x',
                                                displayName: 'X',
                                                role,
                                            }
                                          : null,
                                  ),
                    },
                },
            ],
        });
        router = TestBed.inject(Router);
        // 直接開いた直後を想定して、前のテストの状態を空にしておく
        TestBed.inject(UserStateStore).reset();
        return TestBed.runInInjectionContext(() =>
            timetableEditGuard(
                {} as ActivatedRouteSnapshot,
                { url: URL } as RouterStateSnapshot,
            ),
        ) as Promise<boolean | UrlTree>;
    }

    it('ゲストは return_to 付きで /login へ送る', async () => {
        const result = await run(null);

        expect(decodeURIComponent(router.serializeUrl(result as UrlTree))).toBe(
            '/login?return_to=/timetable/update;calendar_id=c1;trip_block_id=b1',
        );
        expect(notificationOpen).not.toHaveBeenCalled();
    });

    it('取得に失敗したら利用者は空のままで、ゲスト扱いで /login へ送る', async () => {
        const result = await run('editor', true);

        expect(TestBed.inject(UserStateQuery).userId).toBeNull();
        expect(decodeURIComponent(router.serializeUrl(result as UrlTree))).toBe(
            '/login?return_to=/timetable/update;calendar_id=c1;trip_block_id=b1',
        );
        expect(notificationOpen).not.toHaveBeenCalled();
    });

    it('役割の足りない登録者は、案内を出して / へ送る', async () => {
        const result = await run('reporter');

        expect(router.serializeUrl(result as UrlTree)).toBe('/');
        expect(notificationOpen).toHaveBeenCalledWith(
            '時刻表を入力する権限がありません',
            'OK',
        );
    });

    it.each(['editor', 'manager'])('%s は通す', async (role) => {
        const result = await run(role);

        expect(result).toBe(true);
        expect(notificationOpen).not.toHaveBeenCalled();
    });

    it('直接開いた直後でも、トークンと利用者を取ってから判定する', async () => {
        await run('editor');

        expect(tokenFetch).toHaveBeenCalledWith({ maxAgeMs: 5000 });
    });
});
